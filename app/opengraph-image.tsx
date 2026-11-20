import { ImageResponse } from "next/og";
import { event } from "@/content/event";
import { longDate } from "@/lib/time";

export const alt = "11 Years of Impact";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0A0B10", color: "#F1ECE2", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: -200, height: 500, background: "radial-gradient(ellipse at 50% 100%, rgba(38,76,215,0.7), rgba(10,11,16,0) 70%)", display: "flex" }} />
        <div style={{ fontSize: 26, letterSpacing: 6, textTransform: "uppercase", color: "#A3A9BC", display: "flex" }}>{event.organization} presents</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 40 }}>
          <div style={{ display: "flex", gap: 22, height: 300, alignItems: "stretch" }}>
            <div style={{ width: 70, background: "#F1ECE2", display: "flex" }} />
            <div style={{ width: 10, background: "#FF6A3D", display: "flex" }} />
            <div style={{ width: 70, background: "#F1ECE2", display: "flex" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1, textTransform: "uppercase", display: "flex" }}>Years of Impact</div>
            <div style={{ fontSize: 34, marginTop: 20, display: "flex" }}>{longDate(event.date)}</div>
            <div style={{ fontSize: 28, color: "#A3A9BC", marginTop: 6, display: "flex" }}>{event.venue.name}, {event.venue.city}</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
