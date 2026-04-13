import http from "./http";
type User = {
    id: number;
    name: string;
    email: string;
}
export const fetchUsersApi = ():Promise<User[]>=> http.get('/users')
