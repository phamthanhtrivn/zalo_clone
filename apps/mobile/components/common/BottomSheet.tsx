import React, { forwardRef, useMemo, ReactNode, useCallback } from "react";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";

type Props = {
  children: ReactNode;
  footer?: ReactNode; // 👈 nhận từ ngoài
  snapPoints?: (string | number)[];
  enableDynamicSizing?: boolean;
};

export type BottomSheetRef = BottomSheetModal;

export const BottomSheet = forwardRef<BottomSheetRef, Props>(
  ({ children, footer, enableDynamicSizing, snapPoints }, ref) => {
    const points = useMemo(() => snapPoints, [snapPoints]);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        enableDynamicSizing={enableDynamicSizing}
        snapPoints={points}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView className="p-6">{children}</BottomSheetView>
      </BottomSheetModal>
    );
  },
);

BottomSheet.displayName = "BottomSheet";
