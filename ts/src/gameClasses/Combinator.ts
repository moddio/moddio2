class Combinator {
	static increase = function* (start: number, end: number, step = 1) {
		while (start <= end) {
			yield start;
			start += step;
		}
	};
	static decrease = function* (start: number, end: number, step = 1) {
		while (start >= end) {
			yield start;
			start -= step;
		}
	};
	static range = function (start: number, end: number, step = 1) {
		if (start < end) {
			return Combinator.increase(start, end, Math.abs(step));
		} else {
			return Combinator.decrease(start, end, Math.abs(step));
		}
	};

	static toggle = function* (a: Generator, b: Generator) {
		while (true) {
			let valueA = a.next();
			let valueB = b.next();
			if (valueA.done && valueB.done) {
				break;
			}
			if (!valueA.done) {
				yield valueA.value;
			}
			if (!valueB.done) {
				yield valueB.value;
			}
		}
	};

	static equal = function* (start: number) {
		yield start;
	};

	static spread = function (start: number, end: number, step = 1) {
		if (start === end) {
			return Combinator.equal(start);
		}
		let middle = Math.floor((end + start) / 2);
		return Combinator.toggle(Combinator.range(middle, start, step), Combinator.range(middle + step, end, step));
	};

	static rect = function* (x: number, y: number) {
		let _x = Combinator.range(0, x - 1);

		while (true) {
			let valueX = _x.next();
			if (valueX.done) {
				break;
			} else {
				let _y = Combinator.range(0, y - 1);
				while (true) {
					let valueY = _y.next();
					if (valueY.done) {
						break;
					} else {
						yield { x: valueX.value, y: valueY.value };
					}
				}
			}
		}
	};

	static circle = function* (radius: number) {
		if (radius < 1) {
			throw 'radius must greater than 1';
		}
		let rightIndex = (radius - 1) * 2;
		let _y = Combinator.spread(0, rightIndex);
		let distance = 0;

		while (true) {
			let valueY = _y.next();
			if (valueY.done) {
				break;
			} else {
				let chord = Math.ceil(Math.sqrt(radius ** 2 - Math.floor(distance) ** 2) - 0.1);
				let _x = Combinator.spread(0 + radius - chord, rightIndex - radius + chord);
				while (true) {
					let valueX = _x.next();
					if (valueX.done) {
						if (distance === 0) {
							distance += 1;
						} else {
							distance += 0.5;
						}
						break;
					} else {
						yield { x: valueX.value, y: valueY.value };
					}
				}
			}
		}
	};

	static diamond = function* (radius: number) {
		if (radius < 1) {
			throw 'radius must greater than 1';
		}
		let rightIndex = (radius - 1) * 2;
		let _y = Combinator.spread(0, rightIndex);
		let distance = 0;

		while (true) {
			let valueY = _y.next();
			if (valueY.done) {
				break;
			} else {
				let _x = Combinator.spread(0 + Math.floor(distance), rightIndex - Math.floor(distance));
				while (true) {
					let valueX = _x.next();
					if (valueX.done) {
						if (distance === 0) {
							distance += 1;
						} else {
							distance += 0.5;
						}
						break;
					} else {
						yield { x: valueX.value, y: valueY.value };
					}
				}
			}
		}
	};
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	module.exports = Combinator;
}
