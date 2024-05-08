export interface UTXO {
	txid: string | Uint8Array
	vout: number
	value: number
	nonWitnessUtxo?: Uint8Array
	witnessUtxo?: {
		script: Uint8Array
		value: number
	}
	redeemScript?: Uint8Array
	witnessScript?: Uint8Array
	isTaproot?: boolean
}

export interface Target {
	address?: string
	script?: Uint8Array
	value?: number
}

export interface selectedUTXO {
	inputs?: UTXO[]
	outputs?: Target[]
	fee: number
}
