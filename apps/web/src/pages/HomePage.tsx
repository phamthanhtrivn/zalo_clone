import { useState, useEffect } from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "../components/ui/carousel"
import { cn } from "../lib/utils"

const slides = [
  {
    title: "Trải nghiệm xuyên suốt",
    description: "Kết nối và giải quyết công việc trên mọi thiết bị với dữ liệu luôn được đồng bộ",
    image: (
      <div className="relative w-48 h-48">
        <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-pulse"></div>
        <div className="absolute inset-4 bg-blue-500/20 rounded-full"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-28 bg-white border-2 border-blue-500 rounded-lg shadow-xl flex flex-col p-2 space-y-1">
            <div className="w-full h-2 bg-blue-100 rounded"></div>
            <div className="w-2/3 h-1 bg-gray-100 rounded"></div>
            <div className="w-full h-8 bg-blue-50 rounded mt-auto"></div>
          </div>
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-12 h-20 bg-white border border-gray-200 rounded-md shadow-md p-1.5 flex flex-col space-y-1 scale-75">
            <div className="w-full h-1 bg-blue-100 rounded"></div>
            <div className="w-full h-4 bg-blue-50 rounded-full mt-auto"></div>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "Gửi file nhanh chóng",
    description: "Chia sẻ file dung lượng lớn cực nhanh, không lo bị giới hạn",
    image: (
      <div className="relative w-48 h-48 flex items-center justify-center">
        <div className="w-16 h-20 bg-blue-500 rounded-lg flex items-center justify-center shadow-lg transform -rotate-12 translate-x-4">
          <span className="text-white font-bold text-xs">PDF</span>
        </div>
        <div className="w-16 h-20 bg-[#0091ff] rounded-lg flex items-center justify-center shadow-lg z-10">
          <span className="text-white font-bold text-xs">DOCX</span>
        </div>
        <div className="w-20 h-16 bg-white border-2 border-blue-100 rounded-lg absolute bottom-4 right-4 shadow-md flex items-center justify-center overflow-hidden">
          <div className="w-full h-1 bg-blue-500 absolute bottom-0"></div>
          <span className="text-blue-500 text-[10px] font-bold">1.2 GB</span>
        </div>
      </div>
    )
  },
  {
    title: "Phân loại rõ ràng",
    description: "Quản lý hội thoại thông minh với các tab Phân loại riêng biệt",
    image: (
      <div className="relative w-48 h-48 flex items-center justify-center">
        <div className="w-40 h-32 bg-white border border-gray-100 rounded-xl shadow-lg p-3 space-y-2">
          <div className="flex gap-2 border-b border-gray-50 pb-2">
            <div className="h-4 w-12 bg-blue-100 rounded-full border border-blue-200"></div>
            <div className="h-4 w-12 bg-gray-50 rounded-full"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100"></div>
            <div className="flex-1 space-y-1">
              <div className="h-2 w-20 bg-gray-100 rounded"></div>
              <div className="h-2 w-12 bg-gray-50 rounded"></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100"></div>
            <div className="flex-1 space-y-1">
              <div className="h-2 w-16 bg-gray-100 rounded"></div>
              <div className="h-2 w-10 bg-gray-50 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }
]

const HomePage = () => {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!api) {
      return
    }

    setCurrent(api.selectedScrollSnap())

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })
  }, [api])

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white relative px-4 text-center">
      <div className="max-w-[550px] w-full space-y-10 animate-in fade-in zoom-in duration-700">
        {/* Welcome Section */}
        <div className="space-y-4">
          <h2 className="text-[24px] font-normal text-[#1f1f1f]">Chào mừng đến với <span className="font-semibold">Zalo PC!</span></h2>
          <p className="text-[15px] text-[#4f4f4f] leading-relaxed max-w-[420px] mx-auto">
            Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè được tối ưu hóa cho máy tính của bạn.
          </p>
        </div>

        {/* Carousel Illustration */}
        <div className="relative px-12 group">
          <Carousel setApi={setApi} className="w-full" opts={{ loop: true }}>
            <CarouselContent>
              {slides.map((slide, index) => (
                <CarouselItem key={index}>
                  <div className="flex flex-col items-center space-y-8 py-4">
                    <div className="aspect-[16/9] w-full bg-gradient-to-br from-blue-50 to-white rounded-2xl flex items-center justify-center overflow-hidden border border-blue-50/50">
                      {slide.image}
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-[18px] font-semibold text-[#0068ff]">{slide.title}</h3>
                      <p className="text-[14px] text-gray-500 font-medium max-w-[320px]">
                        {slide.description}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="opacity-0 group-hover:opacity-100 transition-opacity -left-4 h-10 w-10 text-blue-500 border-gray-100 shadow-sm" />
            <CarouselNext className="opacity-0 group-hover:opacity-100 transition-opacity -right-4 h-10 w-10 text-blue-500 border-gray-100 shadow-sm" />
          </Carousel>
        </div>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                current === i ? "bg-[#0068ff] w-4" : "bg-gray-200"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default HomePage
