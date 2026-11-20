import Chapter from "@/components/ui/Chapter";
import Countdown from "@/components/ui/Countdown";

export default function CountdownSection() {
  return (
    <section id="countdown" className="section !pt-0" aria-labelledby="countdown-h">
      <div className="wrap">
        <Chapter n="02" label="The countdown" />
        <h2 id="countdown-h" className="display mb-10" style={{ fontSize: "var(--fs-title)" }} data-reveal="mask" data-split="lines">The day is coming</h2>
        <div data-reveal="up"><Countdown /></div>
      </div>
    </section>
  );
}
