import { verifyKey } from 'discord-interactions';

async function test() {
    try {
        const res = await verifyKey("{}", "abcd", "1234", undefined as any);
        console.log("verifyKey with undefined returned:", res);
    } catch (e) {
        console.log("verifyKey with undefined threw:", e.message);
    }
}

test();
