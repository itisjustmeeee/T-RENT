import { api } from "./axios";

import type {
  UserPublic,
  UserUpdate,
  MessageResponse,
} from "../types/user.types";

export const getMe = async (): Promise<UserPublic> => {
  const response = await api.get<UserPublic>("/users/me");
  return response.data;
};

export const updateMe = async (
  data: UserUpdate
): Promise<UserPublic> => {
  const response = await api.patch<UserPublic>("/users/me", data);
  return response.data;
};

export const deleteMe = async (): Promise<MessageResponse> => {
  const response = await api.delete<MessageResponse>("/users/me");
  return response.data;
};