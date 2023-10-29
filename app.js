const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "covid19India.db");
const app = express();
app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server Running at http://localhost:3001/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const ans = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `
    SELECT 
      *
    FROM 
      state;`;

  const stateArray = await db.all(getAllStatesQuery);
  response.send(stateArray.map((eachState) => ans(eachState)));
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT 
      *
    FROM 
      state
    WHERE
      state_id = ${stateId}`;

  const state = await db.get(getStateQuery);
  response.send(ans(state));
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const addDistrictQuery = `
    INSERT INTO
      district (district_name, state_id, cases, cured, active, deaths)
    VALUES
      ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});`;

  const dbResponse = await db.run(addDistrictQuery);
  const newDistrictDetails = dbResponse.lastId;
  response.send("District Successfully Added");
});

const ans2 = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT 
      *
    FROM 
      district
    WHERE
      district_id = ${districtId}`;

  const district = await db.get(getDistrictQuery);
  response.send(ans2(district));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    DELETE FROM
      district
    WHERE
      district_id = ${districtId}`;

  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const updateDistrictQuery = `
    UPDATE
      district
    SET 
      district_name= '${districtName}',
      state_id= '${stateId}',
      cases= '${cases}',
      cured= '${cured}',
      active= '${active}',
      deaths= '${deaths}'
    WHERE 
      district_id = ${districtId};`;

  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const stateQuery = `
    SELECT
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM 
      district
    WHERE 
      state_id = ${stateId}`;

  const stateDetails = await db.get(stateQuery);
  response.send({
    totalCases: stateDetails["SUM(cases)"],
    totalCured: stateDetails["SUM(cured)"],
    totalActive: stateDetails["SUM(active)"],
    totalDeaths: stateDetails["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const uniqueStateQuery = `
    SELECT 
      state_name
    FROM 
      state NATURAL JOIN district
    WHERE 
      district_id = ${districtId}`;

  const stateName = await db.get(uniqueStateQuery);
  response.send(ans(stateName));
});

module.exports = app;
