export default function Loading() {
  return <main aria-busy="true" aria-label="Loading / Đang tải"><div className="metric-grid">{Array.from({length: 4}, (_, index) => <div className="card metric" key={index}/>)}</div><div className="card metric"/></main>;
}
