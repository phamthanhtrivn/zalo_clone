import DeviceSettingDropdown from "@/components/common/setting/DeviceSettingDropdown";
import SettingChooseItem from "@/components/common/setting/SettingChooseItem";
import SettingSection from "@/components/common/setting/SettingSection";
import { useAppDispatch, useAppSelector } from "@/store";
import { getSessions, logOutDevice } from "@/store/auth/authThunk";
import type { Session } from "@/types/auth.type";
import { formatDateTime } from "@/utils/dateTimeFormat.util";
import { getDeviceId } from "@/utils/device.util";
import { ChevronLeft, Globe, Tablet, Smartphone, Ellipsis } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { NestedViewLayout } from "./NestedViewLayout";

export default function AccountSetting() {
  const [currentView, setCurrentView] = useState<
    "main" | "devices" | "password"
  >("main");

  if (currentView === "devices") {
    return <DeviceManagementView onBack={() => setCurrentView("main")} />;
  } else if (currentView === "password") {
    return <ChangePassword onBack={() => setCurrentView("main")} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingSection title="Cá nhân">
        <SettingChooseItem>
          <p className="text-sm">Số điện thoại</p>
        </SettingChooseItem>
        <SettingChooseItem>
          <p className="text-sm">Email</p>
        </SettingChooseItem>
      </SettingSection>
      <SettingSection title="Bảo mật">
        <SettingChooseItem onClick={() => setCurrentView("devices")}>
          <p className="text-sm">Thiết bị đăng nhập</p>
        </SettingChooseItem>
        <SettingChooseItem
          onClick={() => setCurrentView("password")}
          className="border-none"
        >
          <p className="text-sm">Mật khẩu</p>
        </SettingChooseItem>
      </SettingSection>
    </div>
  );
}

function DeviceItemSkeleton() {
  return (
    <div className="flex justify-between items-center w-full p-4 border-b-[0.5px] border-gray-100">
      <div className="flex gap-3 items-center w-full">
        <div className="w-8 h-8 bg-gray-200 rounded-md animate-pulse shrink-0"></div>

        <div className="flex flex-col gap-2 w-full">
          <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          <div className="h-3  bg-gray-200 rounded w-1/4 animate-pulse"></div>
        </div>
      </div>

      <div className="w-5 h-2  bg-gray-200 rounded animate-pulse shrink-0"></div>
    </div>
  );
}

function DeviceManagementView({ onBack }: { onBack: () => void }) {
  const { loading, error } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [sessions, setSessions] = useState<Session[]>();

  const fetchSessions = async () => {
    const rs = await dispatch(getSessions()).unwrap();
    setSessions(rs);
  };

  const onLogoutDevice = async (deviceId: string) => {
    try {
      await dispatch(logOutDevice(deviceId));
      setSessions(sessions?.filter((session) => session.deviceId != deviceId));
      toast.success("Đăng xuất thành công");
    } catch (err: any) {
      toast.error(err.message || "Đăng xuất không thành công");
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    // Bọc toàn bộ bằng Component mới, truyền title và onBack vào
    <NestedViewLayout title="Quản lý thiết bị đăng nhập" onBack={onBack}>
      <SettingSection>
        {loading ? (
          <>
            <DeviceItemSkeleton />
            <DeviceItemSkeleton />
            <DeviceItemSkeleton />
          </>
        ) : (
          sessions?.map((session, index) => (
            <SettingChooseItem
              key={index}
              rightSection={
                session.deviceId !== getDeviceId() ? (
                  <DeviceSettingDropdown
                    onLougout={() => onLogoutDevice(session.deviceId)}
                  />
                ) : (
                  <Ellipsis color="gray" />
                )
              }
            >
              <div className="flex gap-3 items-center">
                <div>
                  {session.deviceType === "browser" ? (
                    <Globe size={30} color="gray" />
                  ) : session.deviceType === "tablet" ? (
                    <Tablet color="gray" />
                  ) : (
                    <Smartphone color="gray" />
                  )}
                </div>
                <div className="flex flex-col gap-1 text-sm text-start">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800">
                      {session.deviceName}
                    </p>
                    {session.deviceId === getDeviceId() && (
                      <p className="bg-blue-500 text-[11px] font-medium text-white rounded-full py-0.5 px-2">
                        Thiết bị này
                      </p>
                    )}
                  </div>
                  <p className="text-gray-500 text-[13px]">
                    Đăng nhập {formatDateTime(session.createdAt)}
                  </p>
                  <p className="text-gray-500 text-[13px]">
                    {session.location}
                  </p>
                </div>
              </div>
            </SettingChooseItem>
          ))
        )}
      </SettingSection>
    </NestedViewLayout>
  );
}

function ChangePassword({ onBack }: { onBack: () => void }) {
  return (
    <NestedViewLayout title="Đổi mật khẩu" onBack={onBack}>
      <div className="flex flex-col gap-4">
        {/* Form đổi mật khẩu của bạn sẽ nằm ở đây */}
        <p className="text-sm text-gray-500">
          Vui lòng nhập mật khẩu hiện tại và mật khẩu mới để thay đổi.
        </p>
        {/* <Input type="password" placeholder="Mật khẩu hiện tại" /> ... */}
      </div>
    </NestedViewLayout>
  );
}
