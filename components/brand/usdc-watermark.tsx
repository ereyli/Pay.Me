export function UsdcWatermark() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-60 dark:opacity-50"
        style={{
          background:
            "radial-gradient(1200px 600px at 50% -20%, rgba(79,163,255,0.12), transparent 70%), linear-gradient(180deg, rgba(11,17,32,0.02) 0%, rgba(11,17,32,0.04) 100%)",
        }}
      />
    </div>
  );
}
