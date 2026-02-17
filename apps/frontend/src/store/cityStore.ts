// import { createEntityStore } from './entityStore'
// import type { PublicCity, CreateCityInput } from '@zod/dto/city.dto'
// import type { CityResponse, CitiesResponse } from '@zod/apiResponse.dto'

// export const useCitiesStore = createEntityStore<PublicCity, CreateCityInput>({
//   name: 'cities',
//   basePath: '/cities',
//   extractMany: (data: CitiesResponse) => data.cities,
//   extractOne: (data: CityResponse) => data.city,
//   createPath: '/cities',
//   updatePath: id => `/cities/${id}`,
//   deletePath: id => `/cities/${id}`,
// })

import { defineStore } from 'pinia'
import { api, axios } from '@/lib/api'

import type { PublicCity, CreateCityPayload } from '@zod/dto/city.dto'
import type { City } from '@zod/generated'
import type { CityResponse, CitiesResponse, ApiError } from '@zod/apiResponse.dto'

interface ServiceError {
  success: false
  message: string
  fieldErrors?: Record<string, string[]>
}

type ServiceResponse<T> = { success: true; data: T } | ServiceError

export const useCitiesStore = defineStore('cities', {
  state: () => ({
    cities: [] as PublicCity[],
    searchResults: [] as PublicCity[],
    currentCity: null as PublicCity | null,
  }),

  actions: {
    /**
     * Fetch all cities
     */
    async fetchAll(): Promise<PublicCity[]> {
      try {
        const res = await api.get<CitiesResponse>('/cities')
        this.cities = res.data.cities
        return this.cities
      } catch (error: any) {
        console.error('Failed to fetch cities:', error)
        throw error.response?.data?.message || 'Failed to fetch cities'
      }
    },

    /**
     * Search cities for autocomplete
     */
    async search(country: string, q: string): Promise<PublicCity[]> {
      try {
        const res = await api.get<CitiesResponse>('/cities/search', {
          params: { q, country },
        })
        this.searchResults = res.data.cities
        return this.searchResults
      } catch (error: any) {
        console.error('Failed to search cities:', error)
        throw error.response?.data?.message || 'Failed to search cities'
      }
    },

    /**
     * Get a single city by ID
     */
    async getCity(id: string): Promise<PublicCity> {
      try {
        const res = await api.get<CityResponse>(`/cities/${id}`)
        this.currentCity = res.data.city
        return this.currentCity
      } catch (error: any) {
        console.error(`Failed to fetch city ${id}:`, error)
        throw error.response?.data?.message || 'Failed to fetch city'
      }
    },

    /**
     * Create a new city
     */
    async create(input: CreateCityPayload): Promise<PublicCity> {
      try {
        const res = await api.post<CityResponse>('/cities', input)
        this.cities.push(res.data.city)
        return res.data.city
      } catch (error: any) {
        console.error('Failed to create city:', error)
        if (axios.isAxiosError(error) && error.response) {
          const errData = error.response.data as ServiceError
          throw errData.message
        }
        throw 'Failed to create city'
      }
    },

    /**
     * Update an existing city
     */
    async updateCity(id: string, input: Partial<City>): Promise<PublicCity> {
      try {
        const res = await api.patch<CityResponse>(`/cities/${id}`, input)
        const idx = this.cities.findIndex((t) => t.id === id)
        if (idx !== -1) this.cities.splice(idx, 1, res.data.city)
        return res.data.city
      } catch (error: any) {
        console.error(`Failed to update city ${id}:`, error)
        throw error.response?.data?.message || 'Failed to update city'
      }
    },

    /**
     * Soft delete a city
     */
    async deleteCity(id: string): Promise<void> {
      try {
        await api.delete(`/cities/${id}`)
        this.cities = this.cities.filter((t) => t.id !== id)
      } catch (error: any) {
        console.error(`Failed to delete city ${id}:`, error)
        throw error.response?.data?.message || 'Failed to delete city'
      }
    },
  },
})
