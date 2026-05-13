import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SpotifyService {
    // Vẫn giữ tên class là SpotifyService để không phải sửa controller/module
    constructor() { }

    async searchTrack(query: string) {
        try {
            // NẾU KHÔNG CÓ TỪ KHÓA -> Tìm kiếm các bài hát pop/hot hit mặc định
            const searchTerm = (query?.trim()) || 'top hit việt nam';
            // Sử dụng iTunes Search API (Miễn phí, không cần Token)
            const res = await axios.get('https://itunes.apple.com/search', {
                params: {
                    term: searchTerm,
                    entity: 'song', // Chỉ tìm bài hát
                    limit: 20,
                    country: 'vn',  // Ưu tiên nhạc Việt
                },
            });

            // Map dữ liệu iTunes về đúng chuẩn Frontend của bạn đang dùng
            return res.data.results
                .filter((t: any) => t.previewUrl) // Chỉ lấy các bài có link nghe thử 30s
                .map((t: any) => ({
                    id: t.trackId.toString(),
                    title: t.trackName,
                    artist: t.artistName,
                    previewUrl: t.previewUrl,
                    // Lấy ảnh bìa chất lượng cao hơn (mặc định 100x100, đổi thành 600x600)
                    image: t.artworkUrl100?.replace('100x100bb', '600x600bb'),
                }));

        } catch (err: any) {
            console.log("❌ LỖI GET DATA MUSIC:", err?.message);
            return []; // Trả về mảng rỗng để app không bị crash
        }
    }
}