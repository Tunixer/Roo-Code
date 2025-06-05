interface _ISerializableType<T> {
	fromDataView(dataView: DataView, offset?: number): T
	writeToDataView(dataView: DataView, data: T): void
}
