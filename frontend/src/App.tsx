import React, { useState } from "react";
import { ethers } from "ethers";

// Ví dụ ABI có event, bạn thay bằng ABI thật của contract nếu muốn parse event decode
const exampleAbi = [
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event AdminSignaturesVerification( bytes message, uint256 nonce, bytes[] signatures)",
    "event Administration1Transfer(address newAdmin1)",
    "event Administration2Transfer(address newAdmin2)",
    "event Administration3Transfer(address newAdmin3)",
    "event Administration4Transfer(address newAdmin4)",
    "event Administration5Transfer(address newAdmin5)",
    "event ManagerAuthorization(address indexed account)",
    "event ManagerDeauthorization(address indexed account)",
    "event ZoneAnnouncement(bytes32 indexed zone)",
    "event ZoneRenouncement(bytes32 indexed zone)",
    "event ZoneActivation(bytes32 indexed zone, address indexed account)",
    "event ZoneDeactivation(bytes32 indexed zone, address indexed account)",
    "event CurrencyRegistryUpdate(address indexed currency, bool isAvailable, bool isExclusive)"
];

export default function App() {
    const [address, setAddress] = useState("");
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function fetchEvents() {
        setError(null);
        setLoading(true);
        setEvents([]);

        try {
            const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
            const iface = new ethers.utils.Interface(exampleAbi);
            const filter = {
                address,
                fromBlock: 0,
                toBlock: "latest",
            };
            const logs = await provider.getLogs(filter);
            const decodedEvents = logs.map(log => {
                try {
                    const parsed = iface.parseLog(log);
                    return {
                        name: parsed.name,
                        signature: parsed.signature,
                        args: parsed.args,
                        transactionHash: log.transactionHash,
                        blockNumber: log.blockNumber,
                    };
                } catch {
                    return {
                        name: "Unknown event",
                        data: log.data,
                        topics: log.topics,
                        transactionHash: log.transactionHash,
                        blockNumber: log.blockNumber,
                    };
                }
            });
            setEvents(decodedEvents);
        } catch (e: any) {
            setError(e.message || "Error fetching events");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                maxWidth: 700,
                margin: "auto",
                padding: 20,
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                backgroundColor: "#f0f2f5",
                minHeight: "100vh",
            }}
        >
            <h1 style={{ textAlign: "center", marginBottom: 24, color: "#222" }}>
                Search Contract Events
            </h1>

            <input
                type="text"
                placeholder="Enter contract address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={{
                    width: "100%",
                    padding: 12,
                    fontSize: 16,
                    borderRadius: 6,
                    border: "1.5px solid #ccc",
                    outline: "none",
                    marginBottom: 12,
                    boxSizing: "border-box",
                    transition: "border-color 0.3s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "#0070f3")}
                onBlur={e => (e.currentTarget.style.borderColor = "#ccc")}
            />
            <button
                onClick={fetchEvents}
                disabled={loading || !ethers.utils.isAddress(address)}
                style={{
                    width: "100%",
                    padding: 12,
                    fontSize: 16,
                    borderRadius: 6,
                    border: "none",
                    backgroundColor: loading || !ethers.utils.isAddress(address) ? "#a0aec0" : "#0070f3",
                    color: "white",
                    cursor: loading || !ethers.utils.isAddress(address) ? "not-allowed" : "pointer",
                    boxShadow:
                        loading || !ethers.utils.isAddress(address)
                            ? "none"
                            : "0 4px 12px rgba(0, 112, 243, 0.4)",
                    transition: "background-color 0.3s",
                    marginBottom: 24,
                }}
                onMouseEnter={e => {
                    if (!loading && ethers.utils.isAddress(address)) e.currentTarget.style.backgroundColor = "#005bb5";
                }}
                onMouseLeave={e => {
                    if (!loading && ethers.utils.isAddress(address)) e.currentTarget.style.backgroundColor = "#0070f3";
                }}
            >
                {loading ? "Loading..." : "Fetch Events"}
            </button>

            {error && (
                <p
                    style={{
                        color: "#b00020",
                        fontWeight: "600",
                        textAlign: "center",
                        marginBottom: 24,
                    }}
                >
                    {error}
                </p>
            )}

            <h2 style={{ color: "#333", borderBottom: "2px solid #0070f3", paddingBottom: 8, marginBottom: 16 }}>
                Events ({events.length})
            </h2>

            {events.length === 0 && !loading && (
                <p style={{ textAlign: "center", color: "#666" }}>No events found.</p>
            )}

            <ul style={{ listStyle: "none", padding: 0 }}>
                {events.map((ev, i) => (
                    <li
                        key={i}
                        style={{
                            backgroundColor: "white",
                            marginBottom: 16,
                            padding: 16,
                            borderRadius: 8,
                            boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
                            transition: "transform 0.15s ease-in-out, box-shadow 0.15s ease-in-out",
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = "scale(1.02)";
                            e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = "scale(1)";
                            e.currentTarget.style.boxShadow = "0 3px 10px rgba(0,0,0,0.1)";
                        }}
                    >
                        <b style={{ fontSize: 18, color: "#0070f3" }}>
                            {ev.name}
                        </b>{" "}
                        <span style={{ color: "#888", fontSize: 14 }}>
              (block #{ev.blockNumber})
            </span>
                        <br />
                        Tx:{" "}
                        <a
                            href={`https://etherscan.io/tx/${ev.transactionHash}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#0070f3", wordBreak: "break-all" }}
                        >
                            {ev.transactionHash}
                        </a>
                        <br />
                        Args:{" "}
                        <pre
                            style={{
                                backgroundColor: "#f5f7fa",
                                padding: 10,
                                borderRadius: 6,
                                fontSize: 14,
                                fontFamily: "'Courier New', Courier, monospace",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                marginTop: 6,
                            }}
                        >
              {ev.args ? JSON.stringify(ev.args, null, 2) : `data: ${ev.data}, topics: ${ev.topics}`}
            </pre>
                    </li>
                ))}
            </ul>
        </div>
    );
}
