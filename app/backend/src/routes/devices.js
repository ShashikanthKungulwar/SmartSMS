import {Router} from 'express';
import Device from '../models/Device.js';
import Rule from '../models/Rule.js'
import authMiddleWare from '../middleware/auth.js';


const router  = Router();

router.use(authMiddleWare);

router.post('/register',async (req,res,next)=>{
    try{
        const {deviceId,fcmToken,platform,appVersion} = req.body;
        if(!deviceId){
            return res.status(400).json({
                error:'deviceId required'
            });
        }
        const device  = await Device.findOneAndUpdate(
            {userId:req.user.id,deviceId:deviceId},
            {fcmToken,platform,appVersion,isActive:true},
            {upsert:true,new:true}
        );

        res.status(201).json(device);
    }catch(e){
        next(e);
    }
});


router.get('/sync', async (req, res, next) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

    const device = await Device.findOne({ userId: req.user.id, deviceId });
    if (!device) return res.status(404).json({ error: 'Device not registered' });

    // Fetch only rules changed since last sync
    const filter = { userId: req.user.id, isActive: true };
    if (device.lastSyncAt) filter.updatedAt = { $gt: device.lastSyncAt };

    const rules = await Rule.find(filter).sort({ priority: -1 });

    // Update lastSyncAt to now
    const syncedAt = new Date();
    await Device.findOneAndUpdate(
      { userId: req.user.id, deviceId },
      { lastSyncAt: syncedAt }
    );

    res.json({
      rules,
      syncedAt,
      total: rules.length,
    });
  } catch (e) { next(e); }
});


router.delete('/:deviceId', async (req, res, next) => {
  try {
    await Device.findOneAndUpdate(
      { userId: req.user.id, deviceId: req.params.deviceId },
      { isActive: false }
    );
    res.json({ message: 'Device deregistered' });
  } catch (e) { next(e); }
});


export default router;