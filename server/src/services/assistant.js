import { ApiError } from '../utils/ApiError.js';

export async function reply() {
  throw ApiError.notBuilt();
}

export async function suggestions() {
  throw ApiError.notBuilt();
}
