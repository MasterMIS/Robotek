'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/ToastProvider';
import { ensureSessionId } from '@/utils/session';
import { 
    MapPinIcon, 
    CameraIcon, 
    ArrowPathIcon,
    MapIcon,
    UserIcon,
    ArrowRightOnRectangleIcon,
    TableCellsIcon,
    DocumentChartBarIcon
} from '@heroicons/react/24/outline';

// We dynamically import the map component so it doesn't break SSR
import dynamic from 'next/dynamic';
const AdminMap = dynamic(() => import('./AdminMap'), { ssr: false });
import AdminTable from './AdminTable';
import AdminReport from './AdminReport';

export default function FieldDriverPage() {
    const { success, error } = useToast();
    const [user, setUser] = useState<any>(null);
    const [isPageLoading, setIsPageLoading] = useState(true);
    
    // State
    const [activeTab, setActiveTab] = useState<'TRACKING' | 'ADMIN_MAP' | 'ADMIN_TABLE' | 'ADMIN_REPORT'>('TRACKING');
    const [currentStatus, setCurrentStatus] = useState<'IDLE' | 'CHECKED_IN' | 'COMPLETED'>('IDLE');
    const [checkInTime, setCheckInTime] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState('00:00:00');
    const [odometerInValue, setOdometerInValue] = useState<string>('');
    
    // Live Location
    const [liveLocation, setLiveLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [liveAddress, setLiveAddress] = useState<string | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Form Action State
    const [showForm, setShowForm] = useState<'CHECK_IN' | 'CHECK_OUT' | null>(null);
    const [odometerReading, setOdometerReading] = useState('');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("environment");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                const authRes = await fetch('/api/auth/session');
                const session = await authRes.json();
                if (session?.user) {
                    setUser(session.user);
                    await fetchAttendanceStatus(session.user.id);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsPageLoading(false);
            }
        };
        init();
    }, []);

    // Timer Logic 
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (currentStatus === 'CHECKED_IN' && checkInTime) {
            interval = setInterval(() => {
                const now = new Date();
                const diff = now.getTime() - checkInTime.getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setElapsedTime(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [currentStatus, checkInTime]);

    // Live Tracking & GPS Polling
    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation not supported');
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setLiveLocation({ lat, lng });
                setLocationError(null);
            },
            (err) => {
                let msg = err.message;
                if (err.code === 1) msg = "Location access denied. Please enable 'Location Services'.";
                setLocationError(msg);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    // Reverse Geocoding
    useEffect(() => {
        if (!liveLocation) return;
        
        const timeoutId = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${liveLocation.lat}&lon=${liveLocation.lng}&zoom=18&addressdetails=1`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.display_name) {
                        setLiveAddress(data.display_name);
                    }
                }
            } catch (err) {
                console.error("Reverse geocoding failed", err);
            }
        }, 1500);

        return () => clearTimeout(timeoutId);
    }, [liveLocation?.lat, liveLocation?.lng]);

    // Background Sync to API when CHECKED_IN
    useEffect(() => {
        if (currentStatus !== 'CHECKED_IN' || !user || !liveLocation) return;

        const syncLocation = async () => {
            try {
                await fetch('/api/field-driver/live', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        userName: user.username,
                        lat: liveLocation.lat,
                        lng: liveLocation.lng
                    })
                });
            } catch (e) {
                console.error("Failed to sync live location", e);
            }
        };

        // Sync every 1 minute (60000ms)
        const intervalId = setInterval(syncLocation, 60000);
        
        // Initial sync when entering state
        syncLocation();

        return () => clearInterval(intervalId);
    }, [currentStatus, user, liveLocation]);


    const fetchAttendanceStatus = async (userId: string) => {
        const res = await fetch(`/api/field-driver?userId=${userId}`);
        if (res.ok) {
            const data = await res.json();
            setCurrentStatus(data.currentStatus);
            if (data.lastCheckIn) setCheckInTime(new Date(data.lastCheckIn));
            if (data.odometerIn) setOdometerInValue(data.odometerIn);
        }
    };

    // Camera handling
    useEffect(() => {
        if (isCameraActive) {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }

            navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacingMode } })
                .then(stream => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    error("Camera access denied or failed. Please allow camera permissions.");
                    setIsCameraActive(false);
                });
        } else {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
        }
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCameraActive, cameraFacingMode]);

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                const photoData = canvasRef.current.toDataURL('image/jpeg', 0.8);
                setCapturedImage(photoData);
                setIsCameraActive(false);
            }
        }
    };

    const handleAction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showForm) return;
        if (!liveLocation) { error("Live location is required. Ensure GPS is enabled."); return; }

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/field-driver', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: showForm,
                    userId: user.id,
                    userName: user.username,
                    latitude: liveLocation.lat,
                    longitude: liveLocation.lng,
                    address: liveAddress,
                    odometer: odometerReading,
                    photo: capturedImage
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Action failed');
            }
            
            const data = await res.json();
            
            setShowForm(null);
            setOdometerReading('');
            setCapturedImage(null);
            await fetchAttendanceStatus(user.id);
            
            if (showForm === 'CHECK_IN') {
                success('Field check-in successful! Tracking active.');
            } else {
                success(`Field check-out successful! Total KM: ${data.totalKm || 'Calculated'}`);
            }
        } catch (e: any) {
            error(e.message || 'Failed to update field attendance');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isPageLoading) return <div className="p-8 text-center text-gray-400 font-bold">Loading Field Tracking...</div>;
    if (!user) return <div className="p-8 text-center text-red-400 font-bold">Unauthorized. Please log in.</div>;

    const isAdmin = user?.role?.toLowerCase() === 'admin';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row items-center gap-4 px-1">
                <div className="flex flex-col items-start gap-1">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight truncate uppercase">Field Tracking</h1>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest hidden md:block">Live GPS & Route Management</span>
                </div>

                {isAdmin && (
                    <div className="flex-1 w-full flex justify-center lg:justify-end overflow-x-auto no-scrollbar pb-1 -mb-1">
                        <div 
                            style={{ backgroundColor: 'var(--panel-card)' }}
                            className="rounded-full border-2 border-b-4 border-[#003875] dark:border-[#FFD500] shadow-sm transition-all p-1 flex items-center gap-1.5 min-w-max"
                        >
                            <button
                                onClick={() => setActiveTab('TRACKING')}
                                className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'TRACKING' ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                title="My Tracking"
                            >
                                <UserIcon className="w-4 h-4 shrink-0" /> <span className="hidden md:block">My Tracking</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('ADMIN_MAP')}
                                className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ADMIN_MAP' ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                title="Admin Map"
                            >
                                <MapIcon className="w-4 h-4 shrink-0" /> <span className="hidden md:block">Admin Map</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('ADMIN_TABLE')}
                                className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ADMIN_TABLE' ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                title="Admin Logs"
                            >
                                <TableCellsIcon className="w-4 h-4 shrink-0" /> <span className="hidden md:block">Admin Logs</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('ADMIN_REPORT')}
                                className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ADMIN_REPORT' ? 'bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                title="Admin Report"
                            >
                                <DocumentChartBarIcon className="w-4 h-4 shrink-0" /> <span className="hidden md:block">Admin Report</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {activeTab === 'TRACKING' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    {/* Status Panel */}
                    <div 
                        style={{ backgroundColor: 'var(--panel-card)' }}
                        className="rounded-[32px] shadow-2xl p-8 border border-white/40 dark:border-white/5 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]"
                    >
                        {showForm ? (
                            <form onSubmit={handleAction} className="w-full max-w-sm flex flex-col gap-5 animate-in fade-in zoom-in duration-300">
                                <h3 className="text-xl font-black uppercase text-[#003875] dark:text-[#FFD500] mb-2">
                                    {showForm === 'CHECK_IN' ? 'Start Journey' : 'End Journey'}
                                </h3>
                                
                                {showForm === 'CHECK_OUT' && odometerInValue && (
                                    <div className="text-xs font-bold text-gray-500 mb-2">Starting Odometer was: {odometerInValue}</div>
                                )}

                                <div className="space-y-1 text-left">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Odometer Reading</label>
                                    <input 
                                        type="number" 
                                        value={odometerReading}
                                        onChange={(e) => setOdometerReading(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-black focus:border-[#FFD500] outline-none shadow-inner"
                                        placeholder="e.g. 15420"
                                    />
                                </div>

                                <div className="space-y-1 text-left">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Dashboard Photo</label>
                                    
                                    {!capturedImage && !isCameraActive && (
                                        <button 
                                            type="button"
                                            onClick={() => setIsCameraActive(true)}
                                            className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-[#FFD500] hover:text-[#FFD500] transition-colors"
                                        >
                                            <CameraIcon className="w-8 h-8" />
                                            <span className="text-xs font-bold uppercase tracking-widest">Open Camera</span>
                                        </button>
                                    )}

                                    {isCameraActive && (
                                        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
                                            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
                                            <button 
                                                type="button"
                                                onClick={capturePhoto}
                                                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-full border-4 border-gray-300 active:scale-95 transition-transform"
                                            ></button>
                                            <button 
                                                type="button"
                                                onClick={() => setCameraFacingMode(prev => prev === "environment" ? "user" : "environment")}
                                                className="absolute bottom-4 left-4 p-2 bg-black/50 text-white rounded-full border border-white/20 hover:bg-black/70 flex items-center justify-center transition-colors"
                                                title="Switch Camera"
                                            >
                                                <ArrowPathIcon className="w-5 h-5" />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setIsCameraActive(false)}
                                                className="absolute top-2 right-2 px-3 py-1 bg-black/50 text-white text-[10px] font-bold rounded-full"
                                            >Cancel</button>
                                        </div>
                                    )}
                                    <canvas ref={canvasRef} className="hidden" />

                                    {capturedImage && (
                                        <div className="relative w-full rounded-xl overflow-hidden shadow-md">
                                            <img src={capturedImage} alt="Odometer" className="w-full h-auto" />
                                            <button 
                                                type="button"
                                                onClick={() => { setCapturedImage(null); setIsCameraActive(true); }}
                                                className="absolute top-2 right-2 px-3 py-1 bg-black/50 text-white text-[10px] font-bold rounded-full hover:bg-black/70"
                                            >Retake</button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        type="button"
                                        onClick={() => { setShowForm(null); setCapturedImage(null); setOdometerReading(''); setIsCameraActive(false); }}
                                        className="flex-1 py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 rounded-xl font-black text-xs uppercase tracking-widest"
                                    >Cancel</button>
                                    <button 
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-[2] py-3 bg-[#003875] dark:bg-[#FFD500] text-white dark:text-black rounded-xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Uploading...' : 'Submit'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="w-full animate-in fade-in duration-500 flex flex-col items-center">
                                <div className={`absolute top-0 left-0 w-full h-1.5 ${currentStatus === 'CHECKED_IN' ? 'bg-[#FFD500] animate-pulse' : 'bg-gray-200 dark:bg-white/10'}`}></div>
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4 opacity-80">
                                    {currentStatus === 'CHECKED_IN' ? 'Active Field Journey' : 'Standby Mode'}
                                </h3>
                                
                                {currentStatus === 'CHECKED_IN' && checkInTime && (
                                    <div className="text-[10px] font-bold text-[#003875]/60 dark:text-[#FFD500]/60 mb-2 uppercase tracking-widest bg-[#003875]/5 dark:bg-[#FFD500]/10 px-4 py-1.5 rounded-full border border-[#003875]/10 dark:border-[#FFD500]/20">
                                        Started at {checkInTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                                
                                <div className={`text-6xl font-black mb-10 tracking-tighter font-mono drop-shadow-sm ${currentStatus === 'CHECKED_IN' ? 'text-[#FFD500]' : 'text-gray-300 dark:text-white/20'}`}>
                                    {elapsedTime}
                                </div>
                                
                                {currentStatus === 'IDLE' ? (
                                    <button
                                        onClick={() => setShowForm('CHECK_IN')}
                                        disabled={!liveLocation}
                                        className="w-full max-w-xs py-5 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all bg-[#003875] hover:bg-[#002a58] text-white shadow-xl shadow-[#003875]/30 hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
                                    >
                                        Start Field Check-in
                                    </button>
                                ) : currentStatus === 'CHECKED_IN' ? (
                                    <button 
                                        onClick={() => setShowForm('CHECK_OUT')} 
                                        className="w-full max-w-xs py-5 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/30 hover:-translate-y-1 flex items-center justify-center gap-2"
                                    >
                                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                        End Journey
                                    </button>
                                ) : (
                                    <div className="px-6 py-4 bg-green-500/10 rounded-2xl border border-green-500/20 text-green-600 font-black text-sm uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        Journey Completed
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* GPS Status Panel */}
                    <div 
                        style={{ backgroundColor: 'var(--panel-card)' }}
                        className="rounded-[32px] shadow-2xl p-8 border border-white/40 dark:border-white/5 flex flex-col"
                    >
                         <h3 className="text-xs font-black mb-6 flex items-center gap-2 text-gray-800 dark:text-white uppercase border-b border-gray-100 dark:border-white/5 pb-4">
                            <MapPinIcon className="w-5 h-5 text-[#003875] dark:text-[#FFD500]" /> GPS Signal Status
                         </h3>

                         <div className="flex-1 flex flex-col justify-center items-center">
                            {locationError ? (
                                <div className="text-center p-6 bg-red-500/10 rounded-2xl border border-red-500/20 w-full">
                                    <div className="text-red-500 font-black mb-2 uppercase text-sm">GPS Error</div>
                                    <div className="text-xs text-red-400 font-bold opacity-80">{locationError}</div>
                                </div>
                            ) : liveLocation ? (
                                <div className="w-full relative">
                                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500/20 via-transparent to-transparent opacity-50 blur-xl rounded-full"></div>
                                    <div className="relative p-8 bg-gray-50 dark:bg-slate-900/80 rounded-[24px] border border-red-500/30 text-center shadow-inner flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border-4 border-red-500/20">
                                            <MapPinIcon className="w-8 h-8 text-red-500 animate-bounce" />
                                        </div>
                                        
                                        <div>
                                            <div className="inline-flex items-center gap-2 mb-3 bg-red-500 text-white px-4 py-1.5 rounded-full shadow-lg shadow-red-500/30">
                                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Locked In</span>
                                            </div>
                                            <div className="flex justify-center gap-6 mt-2 bg-white dark:bg-slate-800 py-3 px-6 rounded-xl border border-gray-100 dark:border-white/5">
                                                <div className="text-xs font-mono font-bold text-gray-600 dark:text-gray-300">
                                                    <span className="text-gray-400 mr-2 text-[9px] uppercase tracking-wider block mb-1">Latitude</span> 
                                                    {liveLocation.lat.toFixed(6)}
                                                </div>
                                                <div className="w-px bg-gray-200 dark:bg-white/10"></div>
                                                <div className="text-xs font-mono font-bold text-gray-600 dark:text-gray-300">
                                                    <span className="text-gray-400 mr-2 text-[9px] uppercase tracking-wider block mb-1">Longitude</span> 
                                                    {liveLocation.lng.toFixed(6)}
                                                </div>
                                            </div>

                                            {liveAddress && (
                                                <div className="mt-3 text-[10px] font-bold text-gray-500 dark:text-gray-400 max-w-[280px] text-center leading-relaxed">
                                                    <MapPinIcon className="w-3 h-3 inline mr-1 text-[#003875] dark:text-[#FFD500]" />
                                                    {liveAddress}
                                                </div>
                                            )}
                                        </div>

                                        {currentStatus === 'CHECKED_IN' && (
                                            <div className="text-[10px] font-black text-gray-400 uppercase mt-4 flex items-center gap-1.5">
                                                <ArrowPathIcon className="w-3 h-3 animate-spin" /> Live syncing active
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-400 font-bold text-sm flex flex-col items-center gap-3">
                                    <div className="w-10 h-10 border-4 border-gray-200 border-t-[#003875] rounded-full animate-spin"></div>
                                    Acquiring GPS Signal...
                                </div>
                            )}
                         </div>
                    </div>
                </div>
            )}

            {activeTab === 'ADMIN_MAP' && isAdmin && (
                <div className="h-[calc(100vh-200px)] min-h-[600px] rounded-[32px] overflow-hidden shadow-2xl border border-white/10 relative">
                    <AdminMap />
                </div>
            )}

            {activeTab === 'ADMIN_TABLE' && isAdmin && (
                <div className="h-[calc(100vh-200px)] min-h-[600px] rounded-[32px] overflow-hidden shadow-2xl border border-white/10 relative">
                    <AdminTable />
                </div>
            )}

            {activeTab === 'ADMIN_REPORT' && isAdmin && (
                <div className="h-[calc(100vh-200px)] min-h-[600px] rounded-[32px] overflow-hidden shadow-2xl border border-white/10 relative">
                    <AdminReport />
                </div>
            )}
        </div>
    );
}
