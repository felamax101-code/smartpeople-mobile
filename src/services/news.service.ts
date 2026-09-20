
// ─────────────────────────────────────────────────────────────────────────────
// newsApi.ts — Network layer for the news feature
//
// Every function is a placeholder stub.
// To wire up: uncomment the fetch block inside each function
// and delete the placeholder throw / return below it.
//
// Auth: replace the TODO comment with however your app stores its JWT.
// ─────────────────────────────────────────────────────────────────────────────

import {
    NewsFeedParams,
    PaginatedResponse,
    NewsItem,
    VotePayload,
    VoteResponse,
    ReportPayload,
} from '@/types';
import api from "./api"


export const newsService = {


    fetchNews : async (
        params: NewsFeedParams,
    ): Promise<PaginatedResponse<NewsItem>> => {
       
        const q = new URLSearchParams();
        if (params.search)   q.set('search',    params.search);
        if (params.page)     q.set('page',      String(params.page));
        if (params.pageSize) q.set('page_size', String(params.pageSize));
        

        const {data}= await api.get(`/news/feed/`,{
            params:q
        })
        return data

      
       
    },

    reportNews: async (payload: ReportPayload): Promise<void> => {
        await api.post(`/news/report/${payload.newsId}/`, {

            reason: payload.reason,
            additional_note: payload.additionalNote,
        })
    },

    voteOnNews: async (payload: VotePayload): Promise<VoteResponse> => {
        const { data } =await api.post(`/news/vote/${payload.newsId}/`, { vote_type: payload.voteType })

        return data

    },
    fetchNewsById: async (id: string): Promise<NewsItem> => {

        const { data } = await api.get(`/news/${id}/`)
        return data

    },



}