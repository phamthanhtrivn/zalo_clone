import { Dimensions, PixelRatio } from "react-native";

// Kích thước chuẩn — ví dụ iPhone 14 Pro
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

const { width, height } = Dimensions.get("window");

const [shortDimension, longDemension] =
  width < height ? [width, height] : [height, width];

export const scale = (size: number) =>
  Math.round(
    PixelRatio.roundToNearestPixel((shortDimension / BASE_WIDTH) * size),
  );

export const verticalScale = (size: number) =>
  Math.round(
    PixelRatio.roundToNearestPixel((longDemension / BASE_HEIGHT) * size),
  );

export const moderateScale = (size: number, factor = 0.5) =>
  Math.round(
    PixelRatio.roundToNearestPixel(size + (scale(size) - size) * factor),
  );
