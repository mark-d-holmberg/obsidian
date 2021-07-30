export function patchToken () {
	CONFIG.Token.objectClass.prototype.within5ftOf = function (other) {
		if (!other || !(other instanceof Token)) {
			return false;
		}

		return within5ftOf(this, other);
	};
}

function within5ftOf (a, b) {
	// First just check if token B's centre is inside token A's space.
	if (isPointInsideRectangle(a, b.center)) {
		return true;
	}

	// Draw a 5 ft. area around B and see if it intersects with A.
	const squareGrid = canvas.scene.data.gridType === 1;
	if (squareGrid) {
		// If we're on a square grid then we have a simple test of whether two
		// rectangles (token A and the rectangular 5 ft buffer around token B)
		// intersect.
		const buf = getRectangularBuffer(b, 5);
		if (buf.x >= a.x + a.w || a.x >= buf.x + buf.w) {
			return false;
		}

		if (buf.y >= a.y + a.h || a.y >= buf.y + buf.h) {
			return false;
		}

		return true;
	}

	// If we're not on a square grid, then we have a slightly more complicated
	// test of whether a rectangle (token A) intersects with an ellipse (the
	// 5 ft buffer around token B).
	const buf = getEllipticalBuffer(b, 5);
	const v1 = [a.x, a.y];
	const v2 = [a.x + a.w, a.y];
	const v3 = [a.x, a.y + a.h];
	const v4 = [a.x + a.w, a.y + a.h];

	// Check if any of the edges intersect with the ellipse.
	if (doesLineIntersectEllipse(buf, v1, v2) || doesLineIntersectEllipse(buf, v1, v3)
		|| doesLineIntersectEllipse(buf, v3, v4) || doesLineIntersectEllipse(buf, v2, v4))
	{
		return true;
	}

	// It is possible that the ellipse is entirely contained within the
	// rectangle if the above check has failed, but that case is handled
	// by the general centre-in-space check at the top.
	return false;
}

function getRectangularBuffer (token, buf) {
	// We have a rectangular token of width, height, centred on point cx, cy.
	// We return the dimensions of a rectangle that represents an extra buffer
	// of size buf (in grid units) around that token.
	const dim = canvas.dimensions;
	const unit = dim.size / dim.distance;
	const {x: cx, y: cy} = token.center;
	const {width, height} = token.data;
	const w = (buf * 2 + width * dim.distance) * unit;
	const h = (buf * 2 + height * dim.distance) * unit;
	return {x: cx - w / 2, y: cy - h / 2, w, h};
}

function getEllipticalBuffer (token, buf) {
	// We have a rectangular token of width, height, centred on point cx, cy.
	// We return the dimensions of an ellipse that represents an extra buffer
	// of size buf (in grid units) around that token.
	const dim = canvas.dimensions;
	const unit = dim.size / dim.distance;
	const {x: cx, y: cy} = token.center;
	const {width, height} = token.data;
	const w = (buf + (width - 1) * (dim.distance / 2)) * unit;
	const h = (buf + (height - 1) * (dim.distance / 2)) * unit;
	return {x: cx, y: cy, w, h};
}

function isPointInsideRectangle ({x, y, w, h}, {x: cx, y: cy}) {
	return cx >= x && cx <= x + w && cy >= y && cy <= y + h;
}

function doesLineIntersectEllipse (ellipse, [x1, y1], [x2, y2]) {
	// To determine if a line from point (x1, y1) to point (x2, y2) intersects
	// an ellipse with centre (cx, cy) and axes (w, h), we must find the
	// discriminant of the quadratic equation formed by substituting the
	// parameterised equation for a line into the equation for an ellipse,
	// which is too long for this comment.
	let {x: cx, y: cy, w, h} = ellipse;
	const sq = x => Math.pow(x, 2);

	// Translate the lines as though the ellipse were centred at the origin.
	x1 -= cx;
	x2 -= cx;
	y1 -= cy;
	y2 -= cy;

	// Given a quadratic equation of the form ax² + bx + c = 0
	// compute the terms from our derivation mentioned at the top.
	const a = sq(x2 - x1) / sq(w) + sq(y2 - y1) / sq(h);
	const b = 2 * x1 * (x2 - x1) / sq(w) + 2 * y1 * (y2 - y1) / sq(h);
	const c = sq(x1) / sq(w) + sq(y1) / sq(h) - 1;

	// Compute the discriminant to determine if the line ever intersects the
	// ellipse.
	const d = sq(b) - 4 * a * c;
	if (d < 0) {
		// No solutions.
		return false;
	}

	// The points at which the line intersects the ellipse.
	let p = [];
	if (d === 0) {
		p.push(-b / (2 * a));
	} else {
		p.push((-b + Math.sqrt(d)) / (2 * a));
		p.push((-b - Math.sqrt(d)) / (2 * a));
	}

	// If any of these points are between 0 and 1, then the line segment
	// intersects the ellipse, otherwise it indicates some part of the infinite
	// line would meet the ellipse eventually, but we don't care about such
	// cases.
	return p.some(x => x >= 0 && x <= 1);
}
