import AppAvatar from "../common/AppAvatar";

type Props = {
  name: string;
  avartaUrl?: string;
  desc?: string;
};
export default function UserInfoItem({ name, avartaUrl, desc }: Props) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <AppAvatar
        src={avartaUrl}
        name={name}
        className="w-12 h-12"
      />

      <div>
        <p className="font-semibold text-gray-800">{name}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
