type SettingSectionType = React.ComponentProps<"div"> & {
  title?: string;
  children?: React.ReactNode;
};

export default function SettingSection({
  children,
  title,
}: SettingSectionType) {
  return (
    <div>
      <p className="pb-3">{title}</p>
      <div className="rounded-lg bg-white">{children}</div>
    </div>
  );
}
