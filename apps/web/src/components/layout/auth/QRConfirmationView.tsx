import { Avatar, AvatarImage } from "@/components/ui/avatar";

export default function QRConfirmationView({ user }: { user: any }) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="relative">
        <Avatar className="w-24 h-24">
          <AvatarImage className=" object-cover" src={user.avatar} alt="User" />
        </Avatar>
      </div>
      <div className="text-center px-10">
        <p className="font-bold text-base">{user.name}</p>
        <p className="text-sm text-muted-foreground animate-pulse">
          Quét mã thành công. Vui lòng chọn "Đăng nhập" trên thiết bị di động
          của bạn.
        </p>
      </div>
    </div>
  );
}
