import { RegisterForm } from "@/components/ui/register-form";
import zola from "@/assets/ZolaZola.svg";

const RegisterPage = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen w-full bg-blue-50 py-10 overflow-y-auto">
      <img src={zola} className="w-60 mb-5 shrink-0" />
      <RegisterForm />
    </div>
  );
};

export default RegisterPage;
