import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppDispatch } from "@/store";
import { signIn } from "@/store/auth/authThunk";
import { Smartphone, Lock } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const LoginPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [phone, setPhone] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleOnLogin = async () => {
    try {
      await dispatch(signIn({ phone: phone, password: password })).unwrap();
      toast.success("Đăng nhập thành công");
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(
        err.message || err.message?.error || "Đăng nhập không thành công!",
      );
    }
  };

  const onChangePhone = (value: string) => {
    setPhone(value);
  };

  const onChangePassword = (value: string) => {
    setPassword(value);
  };

  return (
    <div className="flex flex-col justify-center items-center h-full bg-blue-50">
      <div className="bg-white mx-auto w-[40%] h-[55%] rounded-2xl shadow-xl">
        <div className="border-b py-4">
          <p className="text-center font-bold text-lg">
            Đăng nhập với mật khẩu
          </p>
        </div>
        <div className="flex flex-col gap-6 justify-center items-center py-7 ">
          <div className="w-full flex items-center justify-center gap-2">
            <Smartphone size={20} />
            <Input
              type="text"
              className="w-[50%]"
              placeholder="Số điện thoại"
              value={phone}
              onChange={(e) => onChangePhone(e.target.value)}
            />
          </div>
          <div className="w-full flex items-center justify-center gap-2">
            <Lock size={20} />
            <Input
              type="password"
              className="w-[50%]"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => onChangePassword(e.target.value)}
            />
          </div>
          <div className="w-full flex items-center justify-center gap-2">
            <Button className="w-[55%]" onClick={handleOnLogin}>
              Đăng nhập
            </Button>
          </div>
          <a href="" className="text-sm">
            Quên mật khẩu
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
