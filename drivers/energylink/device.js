'use strict';

const Homey = require('homey');
var homewizard = require('./../../includes/homewizard.js');

var debug = false;

var refreshIntervalId;
var refreshIntervalIdReadings;

class HomeWizardEnergylink extends Homey.Device {

	onInit() {

		if (debug) { console.log('HomeWizard Energylink '+this.getName() +' has been inited'); }

		this.startPolling();

		// Init flow triggers
		this._flowTriggerPowerUsed = new Homey.FlowCardTriggerDevice('power_used_changed').register();
		this._flowTriggerPowerNetto = new Homey.FlowCardTriggerDevice('power_netto_changed').register();
		this._flowTriggerPowerS1 = new Homey.FlowCardTriggerDevice('power_s1_changed').register();
		this._flowTriggerMeterPowerS1 = new Homey.FlowCardTriggerDevice('meter_power_s1_changed').register();
		this._flowTriggerPowerS2 = new Homey.FlowCardTriggerDevice('power_s2_changed').register();
		this._flowTriggerMeterPowerS2 = new Homey.FlowCardTriggerDevice('meter_power_s2_changed').register();
		this._flowTriggerMeterPowerUsed = new Homey.FlowCardTriggerDevice('meter_power_used_changed').register();
		this._flowTriggerMeterPowerAggregated = new Homey.FlowCardTriggerDevice('meter_power_aggregated_changed').register();
		this._flowTriggerMeterReturnT1 = new Homey.FlowCardTriggerDevice('meter_return_t1_changed').register();
		this._flowTriggerMeterReturnT2 = new Homey.FlowCardTriggerDevice('meter_return_t2_changed').register();

	}

	flowTriggerPowerUsed( device, tokens ) {
		this._flowTriggerPowerUsed.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerPowerNetto( device, tokens ) {
		this._flowTriggerPowerNetto.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerPowerS1( device, tokens ) {
		this._flowTriggerPowerS1.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerMeterPowerS1( device, tokens ) {
		this._flowTriggerMeterPowerS1.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerPowerS2( device, tokens ) {
		this._flowTriggerPowerS2.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerMeterPowerS2( device, tokens ) {
		this._flowTriggerMeterPowerS2.trigger( device, tokens ).catch( this.error )
	}
	flowTriggerMeterPowerUsed( device, tokens ) {
		this._flowTriggerMeterPowerUsed.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerMeterPowerAggregated( device, tokens ) {
		this._flowTriggerMeterPowerAggregated.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerMeterReturnT1( device, tokens ) {
		this._flowTriggerMeterReturnT1.trigger( device, tokens ).catch( this.error )
	}

	flowTriggerMeterReturnT2( device, tokens ) {
		this._flowTriggerMeterReturnT2.trigger( device, tokens ).catch( this.error )
	}

	startPolling() {

		var me = this;
		refreshIntervalId = setInterval(function () {

			if (debug) {console.log("--Start Energylink Polling-- ");}
			if (debug) {console.log(me.getSetting('homewizard_id'));}
			if(me.getSetting('homewizard_id') !== undefined ) {
				if (debug) {console.log('Poll for '+me.getName());}

				me.getStatus();
			}

		}, 1000 * 10);

		refreshIntervalIdReadings = setInterval(function () {
			if (debug) {console.log("--Start Energylink Readings Polling-- ");}

			if(me.getSetting('homewizard_id') !== undefined ) {
				if (debug) {console.log('Poll for ' + me.getName());}

				me.getReadings();

			}
		}, 1000 * 60);

	}

	getStatus() {
		var homewizard_id = this.getSetting('homewizard_id');

		var me = this;
		homewizard.getDeviceData(homewizard_id, 'energylinks', async function(callback){

			if (Object.keys(callback).length > 0) {

				try {

					me.setAvailable();
					var value_s1 = ( callback[0].t1 ) ; // Read t1 from energylink (solar/water/null)
					var value_s2 = ( callback[0].t2 ) ; // Read t2 from energylink (solar/water/null)
					if (debug) {console.log("t1- " + value_s1);}
					if (debug) {console.log("t2- " + value_s2);}

					// Common Energylink data
					var energy_current_cons = ( callback[0].used.po ); // WATTS Energy used JSON $energylink[0]['used']['po']
					var energy_daytotal_cons = ( callback[0].used.dayTotal ); // KWH Energy used JSON $energylink[0]['used']['dayTotal']
					var energy_daytotal_aggr = ( callback[0].aggregate.dayTotal ) ; // KWH Energy aggregated is used - generated $energylink[0]['aggregate']['dayTotal']
					var energy_current_netto = ( callback[0].aggregate.po ); // Netto power usage from aggregated value, this value can go negative

					// Some Energylink do not have gas information so try to get it else fail silently
					try {
						var gas_daytotal_cons = ( callback[0].gas.dayTotal ); // m3 Energy produced via S1 $energylink[0]['gas']['dayTotal']
						// Consumed gas
						await me.setCapabilityValue("meter_gas.today", gas_daytotal_cons).catch(me.error);
					}
					catch(err) {
						// Error with Energylink no data in Energylink
						console.log ("No Gas information found");
					}

					// Consumed elec current
					await me.setCapabilityValue('measure_power.used', energy_current_cons).catch(me.error);
					// Consumed elec current
					await me.setCapabilityValue('measure_power', energy_current_netto).catch(me.error);
					// Consumed elec current Netto
					await me.setCapabilityValue('measure_power.netto', energy_current_netto).catch(me.error);
					// Consumed elec total day
					await me.setCapabilityValue('meter_power.used', energy_daytotal_cons).catch(me.error);
					// Consumed elec total day
					await me.setCapabilityValue('meter_power.aggr', energy_daytotal_aggr).catch(me.error);
          // Disable meter_power
					// me.removeCapability('meter_power');
					// Set solar used to zero before counting
					var solar_current_prod = 0;
					var solar_daytotal_prod = 0;

					if (value_s1 == 'solar' ) {
						var energy_current_prod = ( callback[0].s1.po ); // WATTS Energy produced via S1 $energylink[0]['s1']['po']
						var energy_daytotal_prod = ( callback[0].s1.dayTotal ); // KWH Energy produced via S1 $energylink[0]['s1']['po']

						var solar_current_prod = solar_current_prod + energy_current_prod;
						var solar_daytotal_prod = solar_daytotal_prod + energy_daytotal_prod;

						if (me.hasCapability('meter_power.s1other')) {
							await me.removeCapability('meter_power.s1other').catch(me.error);
							await me.removeCapability('measure_power.s1other').catch(me.error);
						}
					}

					if (value_s2 == 'solar' ) {
						var energy_current_prod = ( callback[0].s2.po ); // WATTS Energy produced via S1 $energylink[0]['s2']['po']
						var energy_daytotal_prod = ( callback[0].s2.dayTotal ); // KWH Energy produced via S1 $energylink[0]['s2']['dayTotal']

						var solar_current_prod = solar_current_prod + energy_current_prod;
						var solar_daytotal_prod = solar_daytotal_prod + energy_daytotal_prod;
						if (me.hasCapability('meter_power.s2other')) {
							await me.removeCapability('meter_power.s2other').catch(me.error);
							await me.removeCapability('measure_power.s2other').catch(me.error);
						}
					}

					if(value_s1 == 'solar' || value_s2 == 'solar') {
						await me.setCapabilityValue("measure_power.s1", solar_current_prod ).catch(me.error);
						await me.setCapabilityValue("meter_power.s1", solar_daytotal_prod ).catch(me.error);
						if (me.hasCapability('meter_power.s1other')) {
							await me.removeCapability('meter_power.s1other').catch(me.error);
							await me.removeCapability('measure_power.s1other').catch(me.error);
						}
					}

					if (value_s1 == 'water' ) {
						var water_current_cons = ( callback[0].s1.po ); // Water used via S1 $energylink[0]['s1']['po']
						var water_daytotal_cons = ( callback[0].s1.dayTotal / 1000 ); // Water used via S1 $energylink[0]['s1']['dayTotal']
						//console.log("Water- " + water_daytotal_cons);
						// Used water m3
						await me.setCapabilityValue("meter_water", water_daytotal_cons).catch(me.error);
						await me.setCapabilityValue("measure_water", water_current_cons).catch(me.error);

						if (me.hasCapability('meter_power.s1other')) {
							await me.removeCapability('meter_power.s1other').catch(me.error);
							await me.removeCapability('measure_power.s1other').catch(me.error);
						}
					}

					if (value_s2 == 'water' ) {
						var water_current_cons = ( callback[0].s2.po ); // Water used via S2 $energylink[0]['s1']['po']
						var water_daytotal_cons = ( callback[0].s2.dayTotal / 1000 ); // Water used via S1 $energylink[0]['s2']['dayTotal']
						//console.log("Water- " + water_daytotal_cons);
						// Used water m3
						await me.setCapabilityOptions("meter_water", {"decimals":3}).catch(me.error);
						await me.setCapabilityValue("meter_water", water_daytotal_cons).catch(me.error);
						await me.setCapabilityValue("measure_water", water_current_cons).catch(me.error);
						if (me.hasCapability('meter_power.s2other')) {
							await me.removeCapability('meter_power.s2other').catch(me.error);
							await me.removeCapability('measure_power.s2other').catch(me.error);
						}
					}

					if (value_s1 == 'other' ) {
						var other_current_cons_s1 = ( callback[0].s1.po ); // Other used via S1 $energylink[0]['s1']['po']
						var other_daytotal_cons_s1 = ( callback[0].s1.dayTotal ); // Other used via S1 $energylink[0]['s1']['dayTotal']
						//console.log("Other- " + other_daytotal_cons_s1);
						// Used power
						await me.setCapabilityValue("meter_power.s1other", other_daytotal_cons_s1).catch(me.error);
						await me.setCapabilityValue("measure_power.s1other", other_current_cons_s1).catch(me.error);
					}

					if (value_s2 == 'other' ) {
						var other_current_cons_s2 = ( callback[0].s2.po ); // Other used via S2 $energylink[0]['s1']['po']
						var other_daytotal_cons_s2 = ( callback[0].s2.dayTotal ); // Other used via S1 $energylink[0]['s2']['dayTotal']
						//console.log("Other- " + other_daytotal_cons_s2);
						// Used power
						await me.setCapabilityValue("meter_power.s2other", other_daytotal_cons_s2).catch(me.error);
						await me.setCapabilityValue("measure_power.s2other", other_current_cons_s2).catch(me.error);
					}

					// Trigger flows
					if (energy_current_cons != me.getStoreValue("last_measure_power_used") && energy_current_cons != undefined && energy_current_cons != null) {
						//console.log("Current Power - "+ energy_current_cons);
						me.flowTriggerPowerUsed(me, { power_used: energy_current_cons });
						await me.setStoreValue("last_measure_power_used",energy_current_cons).catch(me.error);
					}
					if (energy_current_netto != me.getStoreValue('last_measure_power_netto') && energy_current_netto != undefined && energy_current_netto != null) {
					    //console.log("Current Netto Power - "+ energy_current_netto);
						me.flowTriggerPowerNetto(me, { netto_power_used: energy_current_netto });
						await me.setStoreValue("last_measure_power_netto",energy_current_netto).catch(me.error);
					}

					if (value_s1 != 'other') {
						if (energy_current_prod != me.getStoreValue('last_measure_power_s1') && energy_current_prod != undefined && energy_current_prod != null) {
					        //console.log("Current S1 Solar- "+ solar_current_prod);
						me.flowTriggerPowerS1(me, { power_s1: solar_current_prod });
						await me.setStoreValue("last_measure_power_s1",solar_current_prod).catch(me.error);

						}
					}
					if (value_s1 == 'other') {
						if (other_current_cons_s1 != me.getStoreValue('last_measure_power_s1') && other_current_cons_s1 != undefined && other_current_cons_s1 != null) {
									//console.log("Current S1 - "+ other_current_cons_s1);
						me.flowTriggerPowerS1(me, { power_s1: other_current_cons_s1 });
						await me.setStoreValue("last_measure_power_s1",other_current_cons_s1).catch(me.error);

						}
					}

					if (value_s2 == 'other') {
						if (other_current_cons_s2 != me.getStoreValue('last_measure_power_s2') && other_current_cons_s2 != undefined && other_current_cons_s2 != null) {
									//console.log("Current S2 - "+ other_current_cons_s2);
						me.flowTriggerPowerS2(me, { power_s2: other_current_cons_s2 });
						await me.setStoreValue("last_measure_power_s2",other_current_cons_s2).catch(me.error);

						}
					}


					if (energy_daytotal_cons != me.getStoreValue('last_meter_power_used') && energy_daytotal_cons != undefined && energy_daytotal_cons != null) {
					    //console.log("Used Daytotal- "+ energy_daytotal_cons);
						me.flowTriggerMeterPowerUsed(me, { power_daytotal_used: energy_current_prod });
						await me.setStoreValue("last_meter_power_used",energy_daytotal_cons).catch(me.error);
					}

          if (value_s1 != 'other') {
						if (energy_daytotal_prod != me.getStoreValue('last_meter_power_s1') && energy_daytotal_prod != undefined && energy_daytotal_prod != null) {
					    	//console.log("S1 Daytotal Solar- "+ solar_daytotal_prod);
								me.flowTriggerMeterPowerS1(me, { power_daytotal_s1: solar_daytotal_prod });
								await me.setStoreValue("last_meter_power_s1",solar_daytotal_prod).catch(me.error);
								}
					}

					if (value_s1 == 'other') {
						if (other_daytotal_cons_s1 != me.getStoreValue('last_meter_power_s1') && other_daytotal_cons_s1 != undefined && other_daytotal_cons_s1 != null) {
					    	//console.log("S1 Daytotal- "+ other_daytotal_cons_s1);
								me.flowTriggerMeterPowerS1(me, { power_daytotal_s1: other_daytotal_cons_s1 });
								await me.setStoreValue("last_meter_power_s1",other_daytotal_cons_s1).catch(me.error);
								}
					}

					if (value_s2 == 'other') {
						if (other_daytotal_cons_s2 != me.getStoreValue('last_meter_power_s2') && other_daytotal_cons_s2 != undefined && other_daytotal_cons_s2 != null) {
					    	//console.log("S2 Daytotal- "+ other_daytotal_cons_s2);
								me.flowTriggerMeterPowerS2(me, { power_daytotal_s2: other_daytotal_cons_s2 });
								await me.setStoreValue("last_meter_power_s2",other_daytotal_cons_s2).catch(me.error);
								}
					}

					if (energy_daytotal_aggr != me.getStoreValue('last_meter_power_aggr') && energy_daytotal_aggr != undefined && energy_daytotal_aggr != null) {
					    //console.log("Aggregated Daytotal- "+ energy_daytotal_aggr);
						me.flowTriggerMeterPowerAggregated(me, { power_daytotal_aggr: energy_daytotal_aggr });
						await me.setStoreValue("last_meter_power_aggr",energy_daytotal_aggr).catch(me.error);

					}

				} catch (err) {
					console.log(err);
					me.setUnavailable();
				}
			}

		});

	}

	getReadings() {

		var homewizard_id = this.getSetting('homewizard_id');

		var me = this;
		homewizard.getDeviceData(homewizard_id, 'energylink_el', async function (callback) {

			if (Object.keys(callback).length > 0) {
				try {
					me.setAvailable();

					var metered_gas = callback[2].consumed;
					var metered_electricity_consumed_t1 = callback[0].consumed;
					var metered_electricity_produced_t1 = callback[0].produced;
					var metered_electricity_consumed_t2 = callback[1].consumed;
					var metered_electricity_produced_t2 = callback[1].produced;
					var aggregated_meter_power = (metered_electricity_consumed_t1+metered_electricity_consumed_t2)-(metered_electricity_produced_t1+metered_electricity_produced_t2);

					// Save export data

					if (!me.hasCapability('meter_power')) {
						await me.addCapability('meter_power').catch(me.error);
					}

					await me.setCapabilityValue("meter_gas.reading", metered_gas).catch(me.error);
					await me.setCapabilityValue("meter_power", aggregated_meter_power).catch(me.error);
					await me.setCapabilityValue("meter_power.consumed.t1", metered_electricity_consumed_t1).catch(me.error);
					await me.setCapabilityValue("meter_power.produced.t1", metered_electricity_produced_t1).catch(me.error);
					await me.setCapabilityValue("meter_power.consumed.t2", metered_electricity_consumed_t2).catch(me.error);
					await me.setCapabilityValue("meter_power.produced.t2", metered_electricity_produced_t2).catch(me.error);

					if (metered_electricity_produced_t1 != me.getStoreValue('last_meter_return_t1') && metered_electricity_produced_t1 != undefined && metered_electricity_produced_t1 != null) {
					    	await me.flowTriggerMeterReturnT1(me, { meter_power_produced_t1: metered_electricity_produced_t1 }).catch(me.error);
								await me.setStoreValue("last_meter_return_t1", metered_electricity_produced_t1).catch(me.error);
					}

					if (metered_electricity_produced_t2 != me.getStoreValue('last_meter_return_t2') && metered_electricity_produced_t2 != undefined && metered_electricity_produced_t2 != null) {
					    	await me.flowTriggerMeterReturnT2(me, { meter_power_produced_t2: metered_electricity_produced_t2 }).catch(me.error);
								await me.setStoreValue("last_meter_return_t2", metered_electricity_produced_t2).catch(me.error);
					}


				} catch (err) {
					// Error with Energylink no data in Energylink
					console.log("No Energylink found");
					me.setUnavailable();
				}
			}

		});
	}

	onDeleted() {

		clearInterval(refreshIntervalId);
		clearInterval(refreshIntervalIdReadings);
		console.log("--Stopped Polling--");
		console.log('deleted: ' + JSON.stringify(this));

	}

}

module.exports = HomeWizardEnergylink;
