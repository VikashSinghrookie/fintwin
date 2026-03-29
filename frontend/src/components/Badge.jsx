export default function Badge({ text, variant = 'blue' }) {
  return <span className={`badge ${variant}`}>{text}</span>;
}
