import Button from "../common/Button";

export default function QRConfirmationView({
  user,
  onCancel,
}: {
  user: any;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="relative">
        <img
          src={user.avatar || "/default-avatar.png"}
          className="h-24 w-24 rounded-full border-4 border-blue-500 p-1"
          alt="Avatar"
        />
        <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-green-500 border-2 border-white" />
      </div>
      <div className="text-center">
        <p className="font-bold text-lg">{user.name}</p>
        <p className="text-sm text-muted-foreground animate-pulse">
          Đang chờ xác nhận từ điện thoại...
        </p>
      </div>
    </div>
  );
}
