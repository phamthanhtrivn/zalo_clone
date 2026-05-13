import React, { useEffect, useRef, useState, memo } from "react";
import { 
  Modal, 
  TouchableOpacity, 
  View, 
  Text, 
  Dimensions, 
  SafeAreaView,
  StyleSheet
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoCall } from "@/contexts/VideoCallContext";
import { conversationService } from "@/services/conversation.service";

// Safe WebRTC Import
let RTCView: any = View;
try {
  RTCView = require("react-native-webrtc").RTCView;
} catch (e) {}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function CallTimer({ isOpen }: { isOpen: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!isOpen) { setSeconds(0); return; }
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isOpen]);

  const formatDuration = (s: number) => {
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };

  return <Text className="text-white font-mono text-lg">{formatDuration(seconds)}</Text>;
}

const ParticipantView = memo(({ stream, name, isLocal, camOn = true, micOn = true, style }: any) => {
  return (
    <View style={[styles.participantContainer, style]}>
      {stream && camOn ? (
        <RTCView
          streamURL={stream.toURL()}
          style={StyleSheet.absoluteFillObject}
          objectFit="cover"
          zOrder={isLocal ? 1 : 0}
          mirror={isLocal}
        />
      ) : (
        <View className="flex-1 bg-slate-900 items-center justify-center">
           <View className="w-20 h-20 rounded-full bg-slate-800 items-center justify-center border border-white/10">
              <Ionicons name="person" size={40} color="#475569" />
           </View>
           {!camOn && <Text className="text-slate-500 text-xs mt-3">Camera tắt</Text>}
        </View>
      )}
      
      <View style={styles.nameLabel}>
        <View className="flex-row items-center gap-1.5">
           {!micOn && <Ionicons name="mic-off" size={12} color="#ef4444" />}
           <Text className="text-white text-[10px] font-medium" numberOfLines={1}>
             {isLocal ? "Bạn" : name}
           </Text>
        </View>
      </View>
    </View>
  );
});

// --- Layouts ---

const DirectLayout = ({ localStream, remoteStream, partnerName, camOn, micOn }: any) => (
  <View style={styles.flex1}>
    {/* Remote (Full) */}
    <ParticipantView stream={remoteStream} name={partnerName} isLocal={false} style={styles.flex1} />
    {/* Local (PiP) */}
    <View style={styles.pipContainer}>
      <ParticipantView 
        stream={localStream} 
        name="Bạn" 
        isLocal={true} 
        camOn={camOn} 
        micOn={micOn}
        style={styles.flex1} 
      />
    </View>
  </View>
);

const GroupGrid = ({ localStream, remoteStreams, getName, camOn, micOn, isWaiting }: any) => {
  const remoteEntries = Object.entries(remoteStreams);
  const isAlone = remoteEntries.length === 0;
  const isTwo = remoteEntries.length === 1; // local + 1 remote = 2 total

  if (isAlone) {
    return (
      <View style={styles.flex1}>
        {/* Local camera fullscreen */}
        <ParticipantView stream={localStream} name="Bạn" isLocal={true} camOn={camOn} micOn={micOn} style={styles.flex1} />
        {/* Waiting overlay label */}
        <View style={{ position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="people-outline" size={16} color="#94a3b8" />
            <Text style={{ color: '#94a3b8', fontSize: 13 }}>Đang chờ người khác tham gia...</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={isTwo ? styles.gridContainer : styles.wrapContainer}>
      {remoteEntries.map(([uid, stream]) => (
        <ParticipantView key={uid} stream={stream} name={getName(uid)} isLocal={false} style={isTwo ? styles.halfScreen : styles.gridItem} />
      ))}
      <ParticipantView 
        stream={localStream} 
        name="Bạn" 
        isLocal={true} 
        camOn={camOn} 
        micOn={micOn}
        style={isTwo ? styles.halfScreen : styles.gridItem} 
      />
    </View>
  );
};

// --- Main Overlay ---

export default function ActiveCallOverlay() {
  const { 
    callMode,
    sessionState, 
    videoCallData, 
    localStream, 
    remoteStream,
    remoteStreams, 
    leaveCall 
  } = useVideoCall();

  const isOpen = sessionState === "CONNECTED" || sessionState === "IN_GROUP_CALL" || (callMode === 'GROUP' && sessionState === 'CALLING');
  const isWaiting = callMode === 'GROUP' && sessionState === 'CALLING';
  const isVideo = videoCallData?.callType === "VIDEO";

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && videoCallData?.conversationId) {
      conversationService.getListMembers(videoCallData.conversationId)
        .then(res => res?.data && setMembers(res.data))
        .catch(() => {});
    }
  }, [isOpen, videoCallData?.conversationId]);

  const getName = (id: string) => {
    const member = members.find(m => m.userId === id);
    return member?.name || videoCallData?.fromName || `User_${id.substring(id.length - 4)}`;
  };

  useEffect(() => {
    if (localStream) {
      const aEnabled = localStream.getAudioTracks()?.[0]?.enabled ?? true;
      const vEnabled = localStream.getVideoTracks()?.[0]?.enabled ?? true;
      setMicOn(aEnabled);
      setCamOn(vEnabled);
    }
  }, [localStream, isOpen]);

  const toggleMic = () => {
    if (localStream) {
      const track = localStream.getAudioTracks()[0];
      if (track) { 
        track.enabled = !track.enabled; 
        setMicOn(track.enabled); 
      }
    }
  };

  const toggleCam = () => {
    if (localStream) {
      const track = localStream.getVideoTracks()[0];
      if (track) { 
        track.enabled = !track.enabled; 
        setCamOn(track.enabled); 
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="fade" transparent={false}>
      <View style={styles.container}>
        {/* Conditional Rendering */}
        {callMode === 'DIRECT' ? (
          <DirectLayout 
            localStream={localStream} 
            remoteStream={remoteStream} 
            partnerName={getName(videoCallData.from)} 
            camOn={camOn}
            micOn={micOn}
          />
        ) : (
          <GroupGrid 
            localStream={localStream} 
            remoteStreams={remoteStreams} 
            getName={getName} 
            camOn={camOn}
            micOn={micOn}
          />
        )}

        {/* SHARED CONTROLS */}
        <SafeAreaView style={styles.controlsLayer}>
          <View style={styles.controlsWrapper}>
            <CallTimer isOpen={isOpen} />

            <View style={styles.actionsRow}>
              <TouchableOpacity
                onPress={toggleMic}
                style={[styles.btn, !micOn && styles.btnRed]}
              >
                <Ionicons name={micOn ? "mic" : "mic-off"} size={24} color="white" />
              </TouchableOpacity>

              {isVideo && (
                <TouchableOpacity
                  onPress={toggleCam}
                  style={[styles.btn, !camOn && styles.btnRed]}
                >
                  <Ionicons name={camOn ? "videocam" : "videocam-off"} size={24} color="white" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => leaveCall()}
                style={[styles.btn, styles.btnHangup]}
              >
                <Ionicons name="call" size={24} color="white" style={{ transform: [{ rotate: "135deg" }] }} />
              </TouchableOpacity>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  flex1: { flex: 1 },
  gridContainer: { flex: 1 },
  wrapContainer: { flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center" },
  halfScreen: { flex: 1, borderWidth: 0.5, borderColor: "#1e293b" },
  gridItem: { width: "50%", height: "33.3%", borderWidth: 0.5, borderColor: "#1e293b" },
  pipContainer: { position: "absolute", top: 60, right: 20, width: 120, height: 180, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 10 },
  participantContainer: { backgroundColor: "#020617", overflow: "hidden", position: "relative" },
  nameLabel: { position: "absolute", bottom: 10, left: 10, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  controlsLayer: { position: "absolute", bottom: 0, width: "100%", zIndex: 99 },
  controlsWrapper: { marginHorizontal: 20, marginBottom: 40, padding: 20, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  btn: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  btnRed: { backgroundColor: "#ef4444" },
  btnHangup: { backgroundColor: "#dc2626" }
});
