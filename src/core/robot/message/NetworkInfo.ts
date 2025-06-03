import { Message } from "zeromq"

export interface IPV4Info {
	a: number // uint8_t
	b: number // uint8_t
	c: number // uint8_t
	d: number // uint8_t
	port: number // uint16_t
}

export interface NetworkInfo {
	dealer_info: IPV4Info
	sub_info: IPV4Info
}

export function parseNetworkInfo(msg: Message): NetworkInfo {
	const view = new DataView(msg.buffer)
	let offset = 0
	const isLittleEndian = true

	// Parse dealer_info
	const dealer_info: IPV4Info = {
		a: view.getUint8(offset),
		b: view.getUint8(offset + 1),
		c: view.getUint8(offset + 2),
		d: view.getUint8(offset + 3),
		port: view.getUint16(offset + 4, isLittleEndian),
	}
	offset += 6 // 4 bytes for IP + 2 bytes for port

	// Parse sub_info
	const sub_info: IPV4Info = {
		a: view.getUint8(offset),
		b: view.getUint8(offset + 1),
		c: view.getUint8(offset + 2),
		d: view.getUint8(offset + 3),
		port: view.getUint16(offset + 4, isLittleEndian),
	}

	return {
		dealer_info,
		sub_info,
	}
}

export function ipv4InfoToString(info: IPV4Info): string {
	return `${info.a}.${info.b}.${info.c}.${info.d}`
}

export function ipv4InfoToEndpoint(info: IPV4Info): string {
	return `tcp://${ipv4InfoToString(info)}:${info.port}`
}
