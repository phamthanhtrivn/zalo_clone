import { LoginForm } from "@/components/ui/login-form";

import zola from "@/assets/ZolaZola.svg";

const LoginPage = () => {
  return (
    <div className="flex flex-col justify-center items-center h-full bg-blue-50">
      <img src={zola} className="w-60 mb-5" />
      <LoginForm />
    </div>
  );
};

export default LoginPage;
