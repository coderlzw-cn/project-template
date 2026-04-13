import { fetchUsersApi } from "@/api/users";
import WSClient from "@/api/websocket";
import { useQuery } from "@tanstack/react-query";


const wsClient = new WSClient<{
    type: string;
    payload: any;
}>('ws://127.0.0.1:4000/demo', { handshakeTimeout: 1000, useStash: false, debug: true });



wsClient.on("message", (data) => {
    console.log(data.data);
});

wsClient.on("open", () => {
    console.log("WebSocket 已连接");
});

wsClient.on("close", () => {
    console.log("WebSocket 已关闭");
});

wsClient.on("error", (error) => {
    console.error("WebSocket 错误", error instanceof Error?error.message: "");
});


let count = 0;

export default function Home() {
    const { data } = useQuery({
        queryKey: ['users'],
        queryFn: fetchUsersApi,
        initialData: []
    })

    console.log(data);


    const handlePromiseSend = async () => {
        const newCount = count++;
        const response = await wsClient.sendWithAck<any, { event: string, description: string, count: number }>({ event: "createEvent",  description: "test", count: newCount });
        console.log("count: ", newCount, "response: ", response.description, response.count);
    }

    return <div className="space-y-4">
        <div className="flex items-center">
            <button className="ml-2 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600" onClick={() => console.log(wsClient.isReady())}>获取连接状态</button>
            <button className="ml-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600" onClick={() => wsClient.connect()}>连接</button>
            <button className="ml-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600" onClick={() => wsClient.disconnect()}>断开</button>
            <button className="ml-2 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600" onClick={() => wsClient.send(["1", 2])}>发送字符串</button>
            <button className="ml-2 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600" onClick={() => wsClient.send({ de: "test", description: "test" })}>发送</button>
            <button className="ml-2 bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600" onClick={handlePromiseSend}>
                Promise 发送
            </button>
        </div>
        <pre>
            <code>
                {JSON.stringify(data, null, 2)}
            </code>
        </pre>
    </div>;
}
