"use client";

import {
  BarVisualizer,
  DisconnectButton,
  RoomAudioRenderer,
  RoomContext,
  useVoiceAssistant,
  VideoTrack,
  VoiceAssistantControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { doc, DocumentData, getDoc, updateDoc } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { RemoteAudioTrack, RemoteParticipant, Room } from "livekit-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NoAgentNotification } from "../components/NoAgentNotification";
import TranscriptionView from "../components/TranscriptionView";
import { auth, db } from "../firebase";

import { CloseIcon } from "../components/CloseIcon";

const sampleProducts = [
  {
    id: 1,
    name: "Plain Shirt",
    colors: { red: false, blue: true, black: false },
    price: 25,
  },
  {
    id: 2,
    name: "Jeans",
    colors: { red: false, blue: false, black: true },
    price: 45,
  },
];

export default function ProductsPage() {
  const [agentAudioElements, setAgentAudioElements] = useState<{
    [sid: string]: HTMLAudioElement;
  }>({});
  const [isMuted, setIsMuted] = useState(false);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const router = useRouter();
  interface CartItem {
    id: number;
    name: string;
    color: string;
    price: number;
    quantity: number;
  }

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState([]);
  const [userId, setUserId] = useState<string | null>(null);

  const handleStart = async () => {
    const roomName = "voice-assistant-room";
    const username = "customer-" + Math.random().toString(36).substring(7);
    const res = await fetch(`/api/token?room=${roomName}&username=${username}`);
    const data = await res.json();

    if (!data.token) {
      console.error("❌ Failed to get token", data.error);
      return;
    }

    const livekitRoom = new Room();
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

    if (!livekitUrl) throw new Error("NEXT_PUBLIC_LIVEKIT_URL is missing.");

    await livekitRoom.connect(livekitUrl, data.token);

    console.log("✅ Connected to LiveKit room");

    setRoom(livekitRoom);
    setIsConnected(true);

    livekitRoom.remoteParticipants.forEach((participant: RemoteParticipant) => {
      participant.getTrackPublications().forEach((publication) => {
        if (publication.kind === "audio") {
          const audioTrack = publication.track as RemoteAudioTrack | null;
          if (audioTrack) {
            const audioEl = audioTrack.attach();
            audioEl.autoplay = true;
            audioEl.muted = isMuted;
            document.body.appendChild(audioEl);
            setAgentAudioElements((prev) => ({
              ...prev,
              [participant.sid]: audioEl,
            }));
            setAgentSpeaking(true);
            console.log(
              `✅ Attached pre-existing audio track from ${participant.identity}`
            );
          }
        }
      });
    });

    livekitRoom.on("trackSubscribed", (track, publication, participant) => {
      console.log(
        `🎧 Subscribed to track: ${participant.identity}, kind: ${track.kind}`
      );
      if (track.kind === "audio") {
        const audioEl = (track as RemoteAudioTrack).attach();
        audioEl.muted = isMuted;
        document.body.appendChild(audioEl);
        setAgentAudioElements((prev) => ({
          ...prev,
          [participant.sid]: audioEl,
        }));
        setAgentSpeaking(true);
      }
    });

    livekitRoom.on("trackUnsubscribed", (track, publication, participant) => {
      console.log(
        `🛑 Unsubscribed from track: ${participant.identity}, kind: ${track.kind}`
      );
      if (track.kind === "audio") {
        (track as RemoteAudioTrack).detach().forEach((el) => el.remove());
        setAgentSpeaking(false);
        console.log(`❌ Stopped audio from ${participant.identity}`);
      }
    });
  };

  const handleDisconnect = () => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
      setAgentAudioElements({});
      setAgentSpeaking(false);
      console.log("❌ Fully disconnected from LiveKit room");
    }
  };

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUserId(currentUser.uid);
      loadUserCart(currentUser.uid);
      loadUserOrders(currentUser.uid);
    } else {
      router.push("/sign-in");
    }
  }, [router]);

  const loadUserCart = async (uid: string) => {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      setCart(data.cart || []);
    }
  };

  const loadUserOrders = async (uid: string | null): Promise<void> => {
    if (!uid) return;
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const data = userDoc.data() as DocumentData;
      setOrders(data.orders || []);
    }
  };

  interface Product {
    id: number;
    name: string;
    colors: Record<string, boolean>;
    price: number;
  }

  interface CartItem {
    id: number;
    name: string;
    color: string;
    price: number;
    quantity: number;
  }

  const addToCart = (product: Product, color: string) => {
    if (!product.colors[color]) return;
    const existing = cart.find(
      (item): item is CartItem => item.id === product.id && item.color === color
    );
    if (existing) {
      existing.quantity += 1;
      setCart([...cart]);
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          color,
          price: product.price,
          quantity: 1,
        },
      ]);
    }
  };

  const updateQuantity = (item: CartItem, change: number): void => {
    const updatedCart = cart.map((c: CartItem) =>
      c.id === item.id && c.color === item.color
        ? { ...c, quantity: Math.max(1, c.quantity + change) }
        : c
    );
    setCart(updatedCart);
  };

  const removeItem = (item: CartItem) => {
    const updatedCart = cart.filter(
      (c) => !(c.id === item.id && c.color === item.color)
    );
    setCart(updatedCart);
  };

  const checkout = async (): Promise<void> => {
    if (!userId) {
      alert("User not logged in!");
      return;
    }

    alert("Checkout success!");
    const userRef = doc(db, "users", userId); // userId is guaranteed to be a string here
    const userDoc = await getDoc(userRef);
    const pastOrders = userDoc.exists() ? userDoc.data().orders || [] : [];
    await updateDoc(userRef, {
      cart: [],
      orders: [
        ...pastOrders,
        {
          id: Date.now(),
          items: cart,
          total,
          date: new Date().toISOString(),
        },
      ],
    });
    setCart([]);
    loadUserOrders(userId);
  };

  const cancelOrder = async (orderId: number): Promise<void> => {
    const updatedOrders = orders.filter(
      (o: { id: number }) => o.id !== orderId
    );
    await updateDoc(doc(db, "users", userId as string), {
      orders: updatedOrders,
    });
    setOrders(updatedOrders);
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function SimpleVoiceAssistant(props: { onConnectButtonClicked: () => void }) {
    const { state: agentState } = useVoiceAssistant();

    return (
      <>
        <AnimatePresence mode="wait">
          {agentState === "disconnected" ? (
            <motion.div
              key="disconnected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.09, 1.04, 0.245, 1.055] }}
              className="grid items-center justify-center h-full"
            >
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="uppercase px-4 py-2 bg-white text-black rounded-md"
                onClick={() => props.onConnectButtonClicked()}
              >
                Start a conversation
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="connected"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: [0.09, 1.04, 0.245, 1.055] }}
              className="flex flex-col items-center gap-4 h-full"
            >
              <AgentVisualizer />
              <div className="flex-1 w-full">
                <TranscriptionView />
              </div>
              <div className="w-full">
                <ControlBar
                  onConnectButtonClicked={props.onConnectButtonClicked}
                />
              </div>
              <RoomAudioRenderer />
              <NoAgentNotification state={agentState} />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  function AgentVisualizer() {
    const { state: agentState, videoTrack, audioTrack } = useVoiceAssistant();

    if (videoTrack) {
      return (
        <div className="h-[512px] w-[512px] rounded-lg overflow-hidden">
          <VideoTrack trackRef={videoTrack} />
        </div>
      );
    }
    return (
      <div className="h-[300px] w-full">
        <BarVisualizer
          state={agentState}
          barCount={5}
          trackRef={audioTrack}
          className="agent-visualizer"
          options={{ minHeight: 24 }}
        />
      </div>
    );
  }

  function ControlBar(props: { onConnectButtonClicked: () => void }) {
    const { state: agentState } = useVoiceAssistant();

    return (
      <div className="relative h-[60px]">
        <AnimatePresence>
          {agentState === "disconnected" && (
            <motion.button
              initial={{ opacity: 0, top: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, top: "-10px" }}
              transition={{ duration: 1, ease: [0.09, 1.04, 0.245, 1.055] }}
              className="uppercase absolute left-1/2 -translate-x-1/2 px-4 py-2 bg-white text-black rounded-md"
              onClick={() => props.onConnectButtonClicked()}
            >
              Start a conversation
            </motion.button>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {agentState !== "disconnected" && agentState !== "connecting" && (
            <motion.div
              initial={{ opacity: 0, top: "10px" }}
              animate={{ opacity: 1, top: 0 }}
              exit={{ opacity: 0, top: "-10px" }}
              transition={{ duration: 0.4, ease: [0.09, 1.04, 0.245, 1.055] }}
              className="flex h-8 absolute left-1/2 -translate-x-1/2  justify-center"
            >
              <VoiceAssistantControlBar controls={{ leave: false }} />
              <DisconnectButton>
                <CloseIcon />
              </DisconnectButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  function onDeviceFailure(error: Error) {
    console.error(error);
    alert(
      "Error acquiring camera or microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
    );
  }

  return (
    <div className="relative min-h-screen p-4 text-white bg-black">
      <h1 className="text-3xl font-bold mb-4">Products</h1>

      <div className="grid grid-cols-1 gap-4">
        {sampleProducts.map((product) => (
          <div key={product.id} className="border p-4 rounded shadow">
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p>${product.price}</p>
            <div className="flex space-x-2 mt-2">
              {Object.entries(product.colors).map(([color, inStock]) => (
                <button
                  key={color}
                  className={`px-3 py-1 rounded ${
                    inStock
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 text-gray-600 cursor-not-allowed"
                  }`}
                  onClick={() => addToCart(product, color)}
                  disabled={!inStock}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-bold mt-6">Cart</h2>
      <div className="grid grid-cols-1 gap-2 mt-2">
        {cart.map((item) => (
          <div
            key={`${item.id}-${item.color}`}
            className="flex justify-between items-center border p-2 rounded"
          >
            <span>
              {item.name} ({item.color}) x {item.quantity}
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => updateQuantity(item, 1)}
                className="bg-blue-500 px-2 rounded"
              >
                +
              </button>
              <button
                onClick={() => updateQuantity(item, -1)}
                className="bg-blue-500 px-2 rounded"
              >
                -
              </button>
              <button
                onClick={() => removeItem(item)}
                className="bg-red-500 px-2 rounded"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-gray-800 rounded">
        <h3 className="text-xl font-bold mb-2">Checkout Summary</h3>
        <ul className="mb-2">
          {cart.map((item) => (
            <li key={`${item.id}-${item.color}`}>
              {item.name} ({item.color}) x {item.quantity} - $
              {item.price * item.quantity}
            </li>
          ))}
        </ul>
        <p className="font-semibold">Total: ${total}</p>
        <button
          className="mt-2 bg-purple-600 text-white px-6 py-2 rounded"
          onClick={checkout}
        >
          Checkout
        </button>
      </div>

      <h2 className="text-2xl font-bold mt-6">Past Orders</h2>
      <div className="grid grid-cols-1 gap-2 mt-2">
        {orders.map(
          (order: {
            id: number;
            date: string;
            items: CartItem[];
            total: number;
          }) => (
            <div key={order.id} className="border p-2 rounded">
              <p className="font-semibold">
                Order #{order.id} - {new Date(order.date).toLocaleString()}
              </p>
              <ul>
                {order.items.map((item) => (
                  <li key={`${item.id}-${item.color}`}>
                    {item.name} ({item.color}) x {item.quantity}
                  </li>
                ))}
              </ul>
              <p className="font-semibold">Total: ${order.total}</p>
              <button
                className="mt-2 bg-red-500 text-white px-4 py-1 rounded"
                onClick={() => cancelOrder(order.id)}
              >
                Cancel / Refund
              </button>
            </div>
          )
        )}
      </div>

      {/* Voice Assistant Button */}
      <button
        className="fixed bottom-6 right-6 bg-black text-white p-4 rounded-full shadow-lg hover:bg-gray-800"
        onClick={() => setShowAssistant(!showAssistant)}
      >
        🎤 AI Voice Assistant
      </button>

      {showAssistant && (
        <div className="fixed bottom-20 right-6 bg-white text-black p-4 rounded shadow-lg w-80">
          <h3 className="text-lg font-bold mb-2">How can I help you today?</h3>
          {!isConnected ? (
            <button
              onClick={handleStart}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Start Talking
            </button>
          ) : (
            <>
              <RoomContext.Provider value={room || undefined}>
                <div className="lk-room-container max-w-[1024px] w-[90vw] mx-auto max-h-[90vh]">
                  <SimpleVoiceAssistant onConnectButtonClicked={handleStart} />
                </div>
              </RoomContext.Provider>
            </>
          )}
        </div>
      )}

      {isConnected && (
        <div className="flex items-center mt-2">
          <span
            className={`w-3 h-3 rounded-full mr-2 ${
              agentSpeaking ? "bg-green-500 animate-ping" : "bg-gray-400"
            }`}
          ></span>
          <span className="text-sm">
            {agentSpeaking ? "Agent is speaking..." : "Agent is idle"}
          </span>
        </div>
      )}

      {isConnected && (
        <button
          onClick={() => {
            setIsMuted((prev) => {
              const newMuted = !prev;
              Object.values(agentAudioElements).forEach((el) => {
                el.muted = newMuted;
              });
              return newMuted;
            });
          }}
        >
          {isMuted ? "Unmute Agent" : "Mute Agent"}
        </button>
      )}

      {isConnected ? (
        <button
          className="bg-red-500 text-white px-4 py-2 rounded"
          onClick={() => {
            room?.disconnect();
            setRoom(null);
            setIsConnected(false);
            console.log("❌ Disconnected from LiveKit room");
          }}
        >
          Disconnect Agent
        </button>
      ) : (
        <button
          className="bg-green-500 text-white px-4 py-2 rounded"
          onClick={handleStart}
        >
          Connect Agent
        </button>
      )}

      <button
        className="bg-red-500 text-white px-4 py-2 rounded"
        onClick={handleDisconnect}
      >
        Disconnect Agent
      </button>
    </div>
  );
}
