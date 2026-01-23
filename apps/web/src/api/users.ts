import http, {type ApiResponse } from "./http";
type User = {
    id: number;
    name: string;
    email: string;
}
export const fetchUsersApi = ():User[]=> http.get('/users')
