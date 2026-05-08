        

 // 1. Bypass corporate SSL inspection
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fetch = require('cross-fetch');
const nodemailer = require('nodemailer');
const ical = require('node-ical');

const app = express();
app.use(cors());
app.use(express.json());

// 2. Supabase Setup
const supabaseUrl = 'https://lsquxrvufehselooyenj.supabase.co';
const supabaseKey = 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb'; 

let supabase;

// BULLETPROOF PROXY TOGGLE:
if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    console.log("Running in Cloud: Connecting to Supabase directly...");
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.log("Running Locally: Routing through ThreatPulse proxy...");
    const proxyAgent = new HttpsProxyAgent('http://ep.threatpulse.net:80');
    const customFetch = (url, options = {}) => {
        return fetch(url, { ...options, agent: proxyAgent });
    };
    supabase = createClient(supabaseUrl, supabaseKey, {
        global: { fetch: customFetch }
    });
}

// 3. Email Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: 'ttboom2015@gmail.com',         
        pass: 'Ykazb lwxi dyix mqfu' // <--- REPLACE WITH YOUR REAL GMAIL APP PASSWORD
    }
});

// ==========================================
// API ENDPOINTS
// ==========================================

app.get('/api/fields/available', async (req, res) => {
    const { sport, startDate, endDate, postalCode } = req.query;
    try {
        const { data, error } = await supabase.rpc('search_available_fields', {
            p_sport: sport || 'Soccer',
            p_start_date: startDate || '2026-01-01T00:00:00Z',
            p_end_date: endDate || '2026-12-31T23:59:59Z',
            p_postal_code: postalCode || 'H2X',
            p_radius_km: 20
        });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/teams/available', async (req, res) => {
    const { sport, startDate, endDate, postalCode, ageGroup, division, gender } = req.query;
    try {
        const { data, error } = await supabase.rpc('search_available_teams', {
            p_sport: sport || 'Soccer', p_start_date: startDate, p_end_date: endDate,
            p_postal_code: postalCode || 'H2X', p_radius_km: 20,
            p_age_group: ageGroup || 'U12', p_division: division || 'Division 1', p_gender: gender || 'Boys'
        });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/teams', async (req, res) => {
    const { teamName, sport, format, ageGroup, division, postalCode, gender, manager_id } = req.body;
    if (!manager_id) return res.status(400).json({ error: "Missing manager_id" });

    try {
        const { data, error } = await supabase.from('teams').insert([{
            manager_id: manager_id, team_name: teamName, sport: sport, format: format, 
            age_group: ageGroup, division: division, postal_code: postalCode, gender: gender || 'Boys'
        }]).select();
        if (error) throw error;
        res.json({ message: 'Team saved!', team: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/my-team', async (req, res) => {
    const { managerId } = req.query;
    try {
        const { data, error } = await supabase.from('teams').select('*').eq('manager_id', managerId).single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/teams', async (req, res) => {
    const { teamId, teamName, sport, format, ageGroup, division, postalCode, gender } = req.body;
    try {
        const { error } = await supabase.from('teams').update({
            team_name: teamName, sport: sport, format: format, age_group: ageGroup, 
            division: division, postal_code: postalCode, gender: gender
        }).eq('id', teamId);
        if (error) throw error;
        res.json({ message: 'Team updated successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/book-match', async (req, res) => {
    const { availabilityIds, myTeamId, opponentTeamId } = req.body;
    if (!availabilityIds || availabilityIds.length === 0) return res.status(400).json({ error: 'No time slots selected!' });

    try {
        const { data: checkData, error: checkError } = await supabase.from('field_availabilities').select('id, status').in('id', availabilityIds);
        if (checkError) throw checkError;
        
        const alreadyBooked = checkData.some(slot => slot.status !== 'available');
        if (alreadyBooked) return res.status(400).json({ error: 'One or more of these slots were just booked by someone else!' });

        await supabase.from('field_availabilities').update({ status: 'booked' }).in('id', availabilityIds);

        const matchRecords = availabilityIds.map(id => ({
            field_availability_id: id, team_a_id: myTeamId, team_b_id: opponentTeamId || null
        }));
        
        const { error: matchError } = await supabase.from('confirmed_matches').insert(matchRecords);
        if (matchError) throw matchError;

        res.json({ message: 'All selected time slots reserved successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/matches', async (req, res) => {
    const { myTeamId } = req.query;
    if (!myTeamId) return res.status(400).json({ error: "Missing myTeamId" });

    try {
        const { data, error } = await supabase
            .from('confirmed_matches')
            .select(`
                id, 
                field_availabilities(start_time, end_time, fields(name, format, sport)), 
                team_a:team_a_id(team_name, age_group, division), 
                team_b:team_b_id(team_name)
            `)
            .or(`team_a_id.eq.${myTeamId},team_b_id.eq.${myTeamId}`)
            .order('created_at', { ascending: false }); // Simpler ordering for now

        if (error) throw error;

        // Filter for "Upcoming" in Javascript instead of SQL to avoid complex join errors
        const now = new Date();
        const upcomingMatches = data.filter(m => 
            new Date(m.field_availabilities.start_time) >= now
        );

        res.json(upcomingMatches);
    } catch (err) {
        console.error("Backend Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});



app.get('/api/my-open-matches', async (req, res) => {
    const { myTeamId } = req.query;
    try {
        const { data, error } = await supabase
            .from('confirmed_matches')
            .select(`id, field_availabilities (start_time, end_time, fields(name))`)
            .eq('team_a_id', myTeamId)
            .is('team_b_id', null)
            .order('field_availabilities(start_time)', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint 9: Add Opponent AND Send Email Notification
app.post('/api/add-opponent', async (req, res) => {
    const { matchIds, opponentTeamId, myTeamId } = req.body; 
    
    if (!matchIds || matchIds.length === 0) return res.status(400).json({ error: 'No matches selected!' });

    try {
        const { error: updateError } = await supabase
            .from('confirmed_matches')
            .update({ team_b_id: opponentTeamId })
            .in('id', matchIds);

        if (updateError) throw updateError;

        const { data: opponentData } = await supabase
            .from('teams')
            .select('team_name, contact_email')
            .eq('id', opponentTeamId)
            .single();

        const { data: myTeamData } = await supabase
            .from('teams')
            .select('team_name')
            .eq('id', myTeamId)
            .single();

        if (opponentData && opponentData.contact_email) {
            const mailOptions = {
                from: 'ttboom2015@gmail.com', 
                to: opponentData.contact_email, 
                subject: `⚽ Match Challenge: ${myTeamData.team_name} invited you to play!`,
                text: `Hello ${opponentData.team_name} Manager,\n\nYou have been challenged to a match by ${myTeamData.team_name}!\n\nThey have already reserved the field for ${matchIds.length * 30} minutes. Please log in to your FieldFinder dashboard to view the match details, location, and time.\n\nGame on,\nThe FieldFinder Team`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #007bff;">⚽ You've been challenged!</h2>
                        <p>Hello <strong>${opponentData.team_name}</strong> Manager,</p>
                        <p>You have been invited to a match by <strong>${myTeamData.team_name}</strong>.</p>
                        <p>They have already secured the field for <strong>${matchIds.length * 30} minutes</strong>.</p>
                        <p>Please log in to your FieldFinder dashboard to view the exact location, date, and time.</p>
                        <br/>
                        <p>Game on,<br/><strong>The FieldFinder Team</strong></p>
                    </div>
                `
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) console.error("Email failed to send:", error);
                else console.log("Challenge email sent to:", opponentData.contact_email);
            });
        }

        res.json({ message: 'Opponent successfully added and email notification sent!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint 10: Sync External Calendar (iCal)
app.post('/api/sync-calendar', async (req, res) => {
    const { fieldId } = req.body;
    if (!fieldId) return res.status(400).json({ error: "Missing fieldId" });

    try {
        const { data: field } = await supabase.from('fields').select('external_ical_url').eq('id', fieldId).single();
        if (!field || !field.external_ical_url) return res.status(400).json({ error: "No external calendar URL saved." });

        let fetchOptions = {};
        if (process.env.NODE_ENV !== 'production' && !process.env.RENDER) {
            const { HttpsProxyAgent } = require('https-proxy-agent');
            fetchOptions.agent = new HttpsProxyAgent('http://ep.threatpulse.net:80');
        }

        const fetch = require('cross-fetch');
        const ical = require('node-ical'); 
        
        const calResponse = await fetch(field.external_ical_url, fetchOptions);
        if (!calResponse.ok) throw new Error("Failed to download calendar from Google");
        const calText = await calResponse.text();
        const events = await ical.async.parseICS(calText);
        
        // 1. Fetch ALL existing slots for this field from the DB
        const now = new Date().toISOString();
        const { data: existingSlots } = await supabase
            .from('field_availabilities')
            .select('id, start_time, status')
            .eq('field_id', fieldId)
            .gte('start_time', now);

        // Map existing slots by their start_time so we can find them instantly
        const dbMap = {};
        existingSlots?.forEach(slot => {
            dbMap[new Date(slot.start_time).toISOString()] = slot;
        });

        const toUpdateIds = [];
        const toInsert = [];
        let eventsFound = 0;

        // Helper function: Rounds Google event times to your 30-min grid
        const getGridBlocks = (start, end) => {
            let s = new Date(start);
            s.setMinutes(s.getMinutes() < 30 ? 0 : 30, 0, 0); // Round down
            let e = new Date(end);
            if (e.getMinutes() !== 0 && e.getMinutes() !== 30 || e.getSeconds() !== 0) {
                e.setMinutes(e.getMinutes() < 30 ? 30 : 60, 0, 0); // Round up
            }
            let blocks = [];
            while (s < e) {
                let blockEnd = new Date(s.getTime() + 30 * 60000);
                blocks.push({ start: new Date(s), end: blockEnd });
                s = blockEnd;
            }
            return blocks;
        };

        // 2. Loop through Google Events
        for (const key in events) {
            if (events.hasOwnProperty(key)) {
                const ev = events[key];
                if (ev.type === 'VEVENT') {
                    const evEnd = new Date(ev.end);
                    
                    if (evEnd > new Date()) {
                        eventsFound++;
                        const blocks = getGridBlocks(ev.start, ev.end);

                        blocks.forEach(block => {
                            const isoStart = block.start.toISOString();
                            
                            if (dbMap[isoStart]) {
                                // Slot exists in DB! Just update it to 'booked'
                                if (dbMap[isoStart].status !== 'booked') {
                                    toUpdateIds.push(dbMap[isoStart].id);
                                    dbMap[isoStart].status = 'booked'; // Prevent double adding
                                }
                            } else {
                                // Slot DOES NOT exist (it's a Gray ghost). Create it as booked!
                                toInsert.push({
                                    field_id: fieldId,
                                    start_time: isoStart,
                                    end_time: block.end.toISOString(),
                                    status: 'booked',
                                    price: 50.00
                                });
                                dbMap[isoStart] = { status: 'booked' }; // Prevent double adding
                            }
                        });
                    }
                }
            }
        }

        // 3. Save to Database
        if (toUpdateIds.length > 0) {
            await supabase.from('field_availabilities').update({ status: 'booked' }).in('id', toUpdateIds);
        }
        if (toInsert.length > 0) {
            await supabase.from('field_availabilities').insert(toInsert);
        }

        res.json({ message: `Sync complete! Found ${eventsFound} Google events. Created ${toInsert.length} new booked slots and updated ${toUpdateIds.length} existing slots.` });

    } catch (err) {
        console.error("Sync Error:", err);
        res.status(500).json({ error: err.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend is running on port ${PORT}`);
});