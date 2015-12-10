/*
	Copyright 2015 Norut Northern Research Institute
	Author : Ingar Mæhlum Arntzen

  This file is part of the Timingsrc module.

  Timingsrc is free software: you can redistribute it and/or modify
  it under the terms of the GNU Lesser General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  Timingsrc is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public License
  along with Timingsrc.  If not, see <http://www.gnu.org/licenses/>.
*/


/*
	TIMING OBJECT

	range and initial vector may be specified.

	master clock is the clock used by the timing object.
	timestamps in vectors refer to this clock.

	for local timing objects master clock is equal to performance.now
	for timing objects with a timing provider, the master clock will be
	maintained as a representation of the clock used by the timing provider.
	
*/

define(['./timingbase', './timingprovider', 'util/masterclock'], function (timingbase, LocalTimingProvider, MasterClock) {

	'use strict';

	var motionutils = timingbase.motionutils;	
	var TimingBase = timingbase.TimingBase;
	var inherit = timingbase.inherit;

	var TimingObject = function (options) {
		TimingBase.call(this, {timeout:true});
		this._clock = null;
		this._range = null;
		this._vector = null;

		// timing provider
		this._provider = options.provider || new LocalTimingProvider(options);
		this._onSkewChangeWrapper = function () {this._onSkewChange();};
		this._onVectorChangeWrapper = function () {this._onVectorChange();};
		this._provider.on("skewchange", this._onSkewChangeWrapper, this);
		this._provider.on("vectorchange", this._onVectorChangeWrapper, this);

		// initialise
		this._initialise();
		if (this._isReady()) {
			this._preProcess(this._provider.vector);		
		}
	};
	inherit(TimingObject, TimingBase);

	TimingObject.prototype._isReady = function () {return this._clock !== null;};
	TimingObject.prototype._initialise = function () {
		if (!this._provider.isReady()) return;
		if (!this._isReady()) {
			this._clock = new MasterClock(this._provider.skew);
			this._range = this._provider.range;
		}
	};

	TimingObject.prototype._onSkewChange = function () {
		var wasReady = this._isReady();
		this._initialise();
		if (this._isReady()) {
			var skew = this._provider.skew;
			// todo : feed new skew to clock
		}
		if (!wasReady && this._isReady()) {
			this._preProcess(this._provider.vector);
		}
	};

	TimingObject.prototype._onVectorChange = function () {
		this._initialise();
		if (this._isReady()) {
			this._preProcess(this._provider.vector);		
		}
	};

	// Accessors for timing object
	Object.defineProperty(TimingObject.prototype, 'clock', {
		get : function () {	return this._clock; }	
	});
	Object.defineProperty(TimingObject.prototype, 'provider', {
		get : function () {return this._provider; }
	});

	// overrides
	TimingObject.prototype.query = function () {
		if (this.vector === null) return null;
		// reevaluate state to handle range violation
		var vector = motionutils.calculateVector(this.vector, this.clock.now());
		var state = motionutils.getCorrectRangeState(vector, this._range);
		if (state !== motionutils.RangeState.INSIDE) {
			this._preProcess(vector);
		} 
		// re-evaluate query after state transition
		return motionutils.calculateVector(this.vector, this.clock.now());
	};

	TimingObject.prototype.update = function (vector) {
		return this._provider.update(vector);
	};

	TimingObject.prototype._onChange = function (vector) {
		return motionutils.checkRange(vector, this._range);
	};

	// overrides
	TimingObject.prototype._calculateTimeoutVector = function () {
		var freshVector = this.query();
		var res = motionutils.calculateDelta(freshVector, this.range);
		var deltaSec = res[0];
		if (deltaSec === null) return null;
		var position = res[1];
		var vector = motionutils.calculateVector(freshVector, freshVector.timestamp + deltaSec);
		vector.position = position; // avoid rounding errors
		return vector;
	};

	// overrides
	TimingObject.prototype._onTimeout = function (vector) {		
		return motionutils.checkRange(vector, this._range);
	};

	return TimingObject;
});