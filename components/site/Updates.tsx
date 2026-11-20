import Chapter from "@/components/ui/Chapter";
import StayUpdated from "@/components/ui/StayUpdated";

export default function Updates() {
  return (
    <section id="updates" className="section" aria-labelledby="updates-h">
      <div className="wrap">
        <Chapter n="06" label="Stay updated" />
        <h2 id="updates-h" className="display mb-14" style={{ fontSize: "var(--fs-display)" }} data-reveal="mask" data-split="lines">Keep the evening in your pocket</h2>
        <StayUpdated />
      </div>
    </section>
  );
}
