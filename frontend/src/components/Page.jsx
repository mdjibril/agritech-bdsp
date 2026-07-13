import { LoaderCircle, PackageOpen } from 'lucide-react';

export function Loading() {
  return <div className="state"><LoaderCircle className="spin" /><span>Loading current data</span></div>;
}

export function Empty() {
  return <div className="state"><PackageOpen /><span>No data available</span></div>;
}

export default function Page({ title, subtitle, action, children }) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
