export default function Avatar({
  src,
  name,
  size = 36,
}: {
  src: string | null;
  name: string;
  size?: number;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover ring-1 ring-white/15"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-[#e3b341] to-[#a87f24] font-semibold text-[#161200] ring-1 ring-white/10"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {name.charAt(0).toUpperCase() || "?"}
    </div>
  );
}
