export default function RiskBar({ score = 0 }) {
  let color = 'green';
  if (score > 60) color = 'red';
  else if (score > 30) color = 'amber';

  return (
    <div className="risk-bar-container">
      <div
        className={`risk-bar-fill ${color}`}
        style={{ width: `${Math.min(score, 100)}%` }}
      />
    </div>
  );
}
