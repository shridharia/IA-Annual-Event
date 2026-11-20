export default function Chapter({ n, label }: { n: string; label: string }) {
  return (
    <div className="chapter" data-reveal="up">
      <span className="num">{n}</span>
      <span className="label">{label}</span>
      <span className="rule" />
    </div>
  );
}
