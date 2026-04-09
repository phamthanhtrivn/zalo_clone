type Props = {
  name: string;
  avartaUrl?: string;
  desc?: string;
};
export default function UserInfoItem({ name, avartaUrl, desc }: Props) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <img
        src={
          avartaUrl ||
          "https://i0.wp.com/thatnhucuocsong.com.vn/wp-content/uploads/2022/04/Anh-avatar-dep-anh-dai-dien-FB-Tiktok-Zalo.jpg?ssl=1"
        }
        alt={name}
        className="w-12 h-12 rounded-full object-cover"
      />

      <div>
        <p className="font-semibold text-gray-800">{name}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
