import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { FaceLandmarker, FilesetResolver, Landmark } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft, Camera, AlertTriangle } from "lucide-react";
import { sendEvent, startSession, endSession } from "@/lib/api";
import { toast } from "sonner";

const LiveMonitor = () => {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [landmarker, setLandmarker] = useState<FaceLandmarker | null>(null);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [calibrationFrames, setCalibrationFrames] = useState(0);
  const [calibrationData, setCalibrationData] = useState({ pitch: 0, yaw: 0 });
  const [status, setStatus] = useState("Initializing...");
  const [alert, setAlert] = useState<string | null>(null);
  const [cameraStopped, setCameraStopped] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number>();
  const lastEventTime = useRef<number>(0);
  const lastAlertTime = useRef<number>(0);
  const consecutiveAlertsRef = useRef<number>(0);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = "square";
      oscillator.frequency.value = 880; 
      gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime); 
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio beep failed", e);
    }
  };

  const speakWarning = () => {
    try {
      if ('speechSynthesis' in window) {
        if (window.speechSynthesis.speaking) return;
        const utterance = new SpeechSynthesisUtterance("Please focus on the road.");
        utterance.rate = 1.1;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error("Speech failed", e);
    }
  };

  // Constants
  const EAR_THRESHOLD = 0.22;
  const PITCH_THRESHOLD = 30;
  const YAW_THRESHOLD = 30;
  const MAX_CALIBRATION_FRAMES = 60;

  useEffect(() => {
    const initLandmarker = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const l = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        setLandmarker(l);
        faceLandmarkerRef.current = l;
        setStatus("Ready to Calibrate");
      } catch (err) {
        console.error("Failed to load MediaPipe", err);
        setStatus("Error loading AI models");
      }
    };
    initLandmarker();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const calculateEAR = (landmarks: Landmark[]) => {
    // MediaPipe landmark indices for eyes
    const leftEye = [33, 160, 158, 133, 153, 144];
    const rightEye = [362, 385, 387, 263, 373, 380];

    const getEAR = (indices: number[]) => {
      const p = indices.map(i => landmarks[i]);
      const v1 = Math.sqrt(Math.pow(p[1].x - p[5].x, 2) + Math.pow(p[1].y - p[5].y, 2));
      const v2 = Math.sqrt(Math.pow(p[2].x - p[4].x, 2) + Math.pow(p[2].y - p[4].y, 2));
      const h = Math.sqrt(Math.pow(p[0].x - p[3].x, 2) + Math.pow(p[0].y - p[3].y, 2));
      return (v1 + v2) / (2.0 * h);
    };

    return (getEAR(leftEye) + getEAR(rightEye)) / 2;
  };

  const estimatePose = (landmarks: Landmark[]) => {
    // Simple heuristic for pitch/yaw based on relative nose-to-eye-to-chin positions
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const chin = landmarks[152];

    const eyeMidY = (leftEye.y + rightEye.y) / 2;

    // Yaw: Ratio of nose distance to left/right eyes makes it invariant to camera distance
    const distLeft = Math.abs(nose.x - leftEye.x);
    const distRight = Math.abs(rightEye.x - nose.x);
    let yaw = 0;
    if (distLeft + distRight > 0) {
      yaw = ((distLeft - distRight) / (distLeft + distRight)) * 100;
    }
    
    // Pitch: Nose vertical position relative to eye-mid and chin
    const faceHeight = chin.y - eyeMidY;
    let pitch = 0;
    if (faceHeight > 0) {
       const nosePos = (nose.y - eyeMidY) / faceHeight;
       pitch = (nosePos - 0.45) * 200; // 0.45 is roughly neutral
    }

    return { pitch, yaw };
  };

  const processVideo = () => {
    if (webcamRef.current && webcamRef.current.video && faceLandmarkerRef.current) {
      const video = webcamRef.current.video;
      if (video.readyState === 4) {
        const results = faceLandmarkerRef.current.detectForVideo(video, performance.now());
        
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          const ear = calculateEAR(landmarks);
          const { pitch, yaw } = estimatePose(landmarks);

          if (!isCalibrated) {
            setCalibrationFrames(prev => {
              if (prev < MAX_CALIBRATION_FRAMES) {
                setCalibrationData(old => ({
                  pitch: old.pitch + pitch,
                  yaw: old.yaw + yaw
                }));
                return prev + 1;
              } else if (prev === MAX_CALIBRATION_FRAMES) {
                setCalibrationData(old => ({
                  pitch: old.pitch / MAX_CALIBRATION_FRAMES,
                  yaw: old.yaw / MAX_CALIBRATION_FRAMES
                }));
                const token = localStorage.getItem("token");
                if (token) {
                  startSession(token).then(session => {
                    sessionIdRef.current = session.id;
                    setIsCalibrated(true);
                    setStatus("Monitoring...");
                    toast.success("Calibration complete!");
                  }).catch(err => {
                    console.error("Failed to start session", err);
                    setIsCalibrated(true);
                    setStatus("Monitoring...");
                    toast.error("Offline Mode: Events not saving");
                  });
                } else {
                  setIsCalibrated(true);
                  setStatus("Monitoring...");
                }
                return prev + 1;
              } else {
                return prev;
              }
            });
          } else {
            const relPitch = pitch - calibrationData.pitch;
            const relYaw = yaw - calibrationData.yaw;

            let currentAlert = null;
            if (ear < EAR_THRESHOLD) currentAlert = "EYES_CLOSED";
            else if (relYaw > YAW_THRESHOLD) currentAlert = "HEAD_TURN_RIGHT";
            else if (relYaw < -YAW_THRESHOLD) currentAlert = "HEAD_TURN_LEFT";
            else if (relPitch > PITCH_THRESHOLD) currentAlert = "HEAD_DOWN";
            else if (relPitch < -PITCH_THRESHOLD) currentAlert = "HEAD_UP";

            const now = performance.now();

            if (currentAlert) {
              if (now - lastAlertTime.current > 3000) {
                 consecutiveAlertsRef.current = 0;
              }
              lastAlertTime.current = now;

              if (now - lastEventTime.current > 2000) {
                consecutiveAlertsRef.current += 1;
                
                if (consecutiveAlertsRef.current >= 3) {
                   speakWarning();
                } else {
                   playBeep();
                }

                handleAlert(currentAlert, ear, relPitch, relYaw);
                lastEventTime.current = now;
              }
            }
            
            setAlert(currentAlert);
            setStatus("Face detected");
          }
        } else {
          setAlert(null);
          if (isCalibrated) setStatus("Face not detected");
        }
      }
    }
    requestRef.current = requestAnimationFrame(processVideo);
  };

  const handleAlert = async (type: string, ear: number, pitch: number, yaw: number) => {
    const token = localStorage.getItem("token");
    if (!token || !sessionIdRef.current) return;

    try {
      await sendEvent(token, {
        event_type: type,
        session_id: sessionIdRef.current,
        duration_ms: 1000,
        confidence: 0.9,
        event_metadata: {
          ear: parseFloat(ear.toFixed(3)),
          pitch: parseFloat(pitch.toFixed(1)),
          yaw: parseFloat(yaw.toFixed(1))
        }
      });
      console.log("Event sent:", type);
    } catch (err) {
      console.error("Failed to send event", err);
    }
  };

  useEffect(() => {
    if (landmarker) {
      requestRef.current = requestAnimationFrame(processVideo);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [landmarker, isCalibrated, calibrationData]);

  const handleStopCamera = () => {
    setCameraStopped(true);
    setStatus("Camera Stopped");
    setAlert(null);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (webcamRef.current && webcamRef.current.video) {
      const stream = webcamRef.current.video.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }

    const token = localStorage.getItem("token");
    if (token && sessionIdRef.current) {
      endSession(token, sessionIdRef.current).catch(err => {
        console.error("Failed to end session:", err);
      });
      sessionIdRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h1 className="font-bold text-xs sm:text-base whitespace-nowrap">Live Monitor</h1>
            </div>
          </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${landmarker && !cameraStopped ? 'bg-success pulse-dot' : 'bg-destructive'}`} />
            <span className="text-[10px] sm:text-sm font-medium whitespace-nowrap">{status}</span>
          </div>
          {!cameraStopped && (
            <Button variant="destructive" size="sm" onClick={handleStopCamera} className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3">
              Stop
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col items-center justify-center gap-6 max-w-4xl mx-auto w-full">
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-4 border-card shadow-2xl bg-black">
          {!cameraStopped ? (
            <>
              <Webcam
                ref={webcamRef}
                mirrored
                className="w-full h-full object-cover"
                videoConstraints={{ facingMode: "user" }}
              />
              
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-muted-foreground font-medium">Camera has been stopped.</p>
            </div>
          )}

          {/* Overlay UI */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
            {!isCalibrated && landmarker && (
              <div className="bg-black/60 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-white/10 flex flex-col items-center gap-3 sm:gap-4 animate-in zoom-in-95 duration-300 max-w-[90%]">
                <Camera className="h-8 w-8 sm:h-10 sm:w-10 text-primary animate-pulse" />
                <div className="text-center">
                  <h3 className="text-sm sm:text-lg font-bold">Calibration in Progress</h3>
                  <p className="text-[10px] sm:text-sm text-white/70">Please look straight at the camera</p>
                </div>
                <div className="w-32 sm:w-48 h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300" 
                    style={{ width: `${(calibrationFrames / MAX_CALIBRATION_FRAMES) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {alert && (
              <div className="bg-destructive/80 backdrop-blur-xl p-4 sm:p-8 rounded-2xl sm:rounded-full border-4 border-white/20 animate-bounce shadow-[0_0_50px_rgba(239,68,68,0.5)] flex flex-col items-center">
                <AlertTriangle className="h-8 w-8 sm:h-16 sm:w-16 text-white" />
                <p className="mt-2 text-white font-black text-sm sm:text-xl text-center uppercase">{alert.replace(/_/g, " ")}</p>
              </div>
            )}
          </div>

          {/* HUD Info */}
          <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
            <div className="bg-black/50 backdrop-blur-md p-3 rounded-xl border border-white/10 text-[10px] font-mono uppercase tracking-widest text-white/50 space-y-1">
              <p>System: {landmarker ? "ONLINE" : "OFFLINE"}</p>
              <p>Latency: ~32ms</p>
              <p>Buffer: Active</p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default LiveMonitor;
