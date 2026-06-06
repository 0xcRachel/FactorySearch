import localforage from 'localforage';
import type { Question } from '../types';

const FAVORITES_STORE_KEY = 'user_favorites';

export async function getFavorites(): Promise<Question[]> {
  const favorites = await localforage.getItem<Question[]>(FAVORITES_STORE_KEY);
  return favorites || [];
}

export async function addFavorite(question: Question): Promise<void> {
  const favorites = await getFavorites();
  if (!favorites.some(q => q.id === question.id)) {
    favorites.unshift(question); // Add to beginning
    await localforage.setItem(FAVORITES_STORE_KEY, favorites);
  }
}

export async function removeFavorite(id: number): Promise<void> {
  const favorites = await getFavorites();
  const updated = favorites.filter(q => q.id !== id);
  await localforage.setItem(FAVORITES_STORE_KEY, updated);
}

export async function isFavorite(id: number): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some(q => q.id === id);
}
