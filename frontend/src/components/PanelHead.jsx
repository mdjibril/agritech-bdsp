export default function PanelHead({ title, note, action }) {
  return (
    <div className="panel-head">
      <div>
        <h2>{title}</h2>
        <p>{note}</p>
      </div>
      {action}
    </div>
  );
}
