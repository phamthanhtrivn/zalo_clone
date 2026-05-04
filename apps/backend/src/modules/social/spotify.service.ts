import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as qs from 'querystring';

@Injectable()
export class SpotifyService {


    private async getToken() {
        try {
            const clientId = this.configService.get<string>('SPOTIFY_CLIENT_ID');
            const clientSecret = this.configService.get<string>('SPOTIFY_CLIENT_SECRET');

            console.log("SPOTIFY DEBUG:", { clientId, clientSecret });

            const res = await axios.post(
                'https://accounts.spotify.com/api/token',
                qs.stringify({ grant_type: 'client_credentials' }),
                {
                    headers: {
                        Authorization:
                            'Basic ' +
                            Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                },
            );

            return res.data.access_token;

        } catch (err: any) {
            console.log("❌ SPOTIFY TOKEN ERROR:", err?.response?.data || err.message);
            throw err;
        }
    }

    async searchTrack(query: string) {
        const token = await this.getToken();

        const res = await axios.get('https://api.spotify.com/v1/search', {
            headers: { Authorization: `Bearer ${token}` },
            params: { q: query, type: 'track', limit: 20 },
        });

        return res.data.tracks.items.map((t: any) => ({
            id: t.id,
            title: t.name,
            artist: t.artists.map((a: any) => a.name).join(', '),
            previewUrl: t.preview_url,
            image: t.album.images?.[0]?.url,
        }));
    }
}