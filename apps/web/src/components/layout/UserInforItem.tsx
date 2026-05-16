import { conversationService } from "@/services/conversation.service";
import AppAvatar from "../common/AppAvatar";
import { useNavigate } from "react-router-dom";

type Props = {
  name: string;
  avartaUrl?: string;
  desc?: string;
  id?: string;
};
export default function UserInfoItem({ name, avartaUrl, desc, id }: Props) {
  const navigate = useNavigate();
  const handleStartConversation = async (targetUserId: string) => {
    try {
      const response =
        await conversationService.getOrCreateDirect(targetUserId);
      const conversationId =
        response?.data?._id || response?.data?.conversationId || response?._id;

      if (!conversationId) return;

      navigate(`/conversations/${conversationId}`);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="flex items-center gap-3 mb-5" onClick={() => id && handleStartConversation(id)}>
      <AppAvatar src={avartaUrl} name={name} className="w-12 h-12" />

      <div>
        <p className="font-semibold text-gray-800">{name}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
