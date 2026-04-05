import Tips from "@/components/auth/Tips";
import { BottomSheet, BottomSheetRef } from "@/components/common/BottomSheet";
import Button from "@/components/common/Button";
import Container from "@/components/common/Container";
import Header from "@/components/common/Header";
import Input from "@/components/common/TextInput";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  ToastAndroid,
  View,
} from "react-native";
import DatePicker from "react-native-date-picker";
import { formatDate } from "@/utils/formater";
import { Gender } from "../../../../packages/shared-types/src/enums/gender";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { completeSignUp } from "@/store/auth/authThunk";

export default function CompleteRegister() {
  const dispatch = useAppDispatch();
  const { user, error, loading, tmp_token } = useAppSelector(
    (state: any) => state.auth,
  );

  const [sheetType, setSheetType] = useState<"BIRTHDAY" | "GENDER">("BIRTHDAY");

  const [name, setName] = useState<string>("");
  const [gender, setGender] = useState<Gender>();
  const [birthday, setBirthday] = useState<Date | undefined>(undefined);
  const [tempDate, setTempDate] = useState(new Date());
  const [password, setPassword] = useState<string>("");
  const [repassword, setRepassword] = useState<string>("");

  const [isHiddenPass, setHiddenPass] = useState<boolean>(true);
  const [isHiddenPass1, setHiddenPass1] = useState<boolean>(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const openSheet = useCallback((type: "BIRTHDAY" | "GENDER") => {
    setSheetType(type);
    bottomSheetRef.current?.present();
  }, []);

  const signUp = async () => {
    console.log(tmp_token);
    try {
      await dispatch(
        completeSignUp({
          data: {
            name: name,
            birthDay: birthday as Date,
            gender: gender as Gender,
            password: password,
            repassword: repassword,
          },
          tempToken: tmp_token,
        }),
      ).unwrap();
      ToastAndroid.show("Đăng ký thành công", ToastAndroid.SHORT);
    } catch (err: any) {
      if (err && err.errors && Array.isArray(err.errors)) {
        const errorsObj: Record<string, string> = {};

        err.errors.forEach((item: any) => {
          if (item.field) {
            errorsObj[item.field] = item.error;
          }
        });

        setFieldErrors(errorsObj);
        ToastAndroid.show(
          err.message || "Đăng ký thất bại !",
          ToastAndroid.SHORT,
        );
      }
    }
  };

  const GenderSelection = () => (
    <View className="w-full gap-3">
      <Text className="font-semibold text-lg text-center mb-4">
        Chọn giới tính
      </Text>

      {["Nam", "Nữ", "Không chia sẻ"].map((item, index) => (
        <Pressable
          key={item}
          onPress={() => {
            setGender(
              item === "Nam"
                ? Gender.MALE
                : item === "Nữ"
                  ? Gender.FEMALE
                  : Gender.OTHER,
            );
            bottomSheetRef.current?.dismiss();
          }}
          className={`py-4 border-t border-gray-100 active:bg-gray-50 ${index === 2 ? "border-b" : ""}`}
        >
          <Text className="text-base px-4">{item}</Text>
        </Pressable>
      ))}
    </View>
  );

  const BirthDaySelection = () => (
    <View className="items-center gap-3 w-full">
      <Text className="font-semibold text-lg">Chọn ngày sinh</Text>

      <DatePicker
        date={tempDate}
        onDateChange={setTempDate}
        mode="date"
        locale="vi"
        style={{ width: 350 }}
      />

      <Button
        className="bg-primary py-4 w-80"
        onPress={() => {
          setBirthday(tempDate);
          bottomSheetRef.current?.dismiss();
        }}
      >
        <Text className="text-sm font-semibold text-white">Chọn</Text>
      </Button>
    </View>
  );

  return (
    <Container>
      <Header
        back
        gradient
        centerChild={
          <Text className="text-white text-sm font-semibold">
            Tạo tài khoản
          </Text>
        }
      />
      <Tips text="Nhập thông tin để hoàn tất đăng ký" />
      <View className="px-screen-edge mt-2 gap-7">
        <View className="gap-3">
          <Text className="text-sm border-b-[0.5px] py-2 font-semibold">
            Thông tin cá nhân
          </Text>
          <Input
            placeholder="Họ Tên"
            value={name}
            onChangeText={(value) => setName(value)}
          />
          {fieldErrors.name && (
            <Text className="text-red-600 text-xs mt-1 ml-1">
              {fieldErrors.name}
            </Text>
          )}
          <Pressable onPress={() => openSheet("BIRTHDAY")}>
            <Input
              placeholder="Sinh nhật"
              value={birthday ? formatDate(birthday) : ""}
              editable={false}
              icon="calendar-outline"
            />
            {fieldErrors.birthDay && (
              <Text className="text-red-600 text-xs mt-1 ml-1">
                {fieldErrors.birthDay}
              </Text>
            )}
          </Pressable>
          <Pressable onPress={() => openSheet("GENDER")}>
            <Input
              value={gender}
              placeholder="Giới tính"
              editable={false}
              icon="caret-down-circle-outline"
            />
          </Pressable>
          {fieldErrors.gender && (
            <Text className="text-red-600 text-xs mt-1 ml-1">
              {fieldErrors.gender}
            </Text>
          )}
        </View>
        <View className="gap-3">
          <Text className="text-sm border-b-[0.5px] py-2 font-semibold">
            Mật khẩu
          </Text>
          <Input
            placeholder="Mật khẩu"
            security={true}
            value={password}
            onChangeText={(value) => setPassword(value)}
            onPressOnIcon={() => setHiddenPass(!isHiddenPass)}
            icon={isHiddenPass ? `eye-off-outline` : `eye-outline`}
          />
          {fieldErrors.password && (
            <Text className="text-red-600 text-xs mt-1 ml-1">
              {fieldErrors.password}
            </Text>
          )}
          <Input
            placeholder="Xác nhận mật khẩu"
            security={true}
            value={repassword}
            onChangeText={(value) => setRepassword(value)}
            onPressOnIcon={() => setHiddenPass1(!isHiddenPass1)}
            icon={isHiddenPass1 ? `eye-off-outline` : `eye-outline`}
          />
          {fieldErrors.repassword && (
            <Text className="text-red-600 text-xs mt-1 ml-1">
              {fieldErrors.repassword}
            </Text>
          )}
        </View>
        <Button
          className={`${loading ? "bg-secondary" : "bg-primary"} py-3 w-56`}
          onPress={signUp}
        >
          {loading ? (
            <ActivityIndicator color="black" />
          ) : (
            <Text className={`text-white font-semibold text-sm`}>Tiếp tục</Text>
          )}
        </Button>
      </View>

      <BottomSheet enableDynamicSizing={true} ref={bottomSheetRef}>
        <View className="items-center gap-3">
          {sheetType === "BIRTHDAY" ? (
            <BirthDaySelection />
          ) : (
            // NỘI DUNG CHỌN GIỚI TÍNH
            <GenderSelection />
          )}
        </View>
      </BottomSheet>
    </Container>
  );
}
