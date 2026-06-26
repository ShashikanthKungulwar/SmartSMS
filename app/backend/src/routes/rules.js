import {Router} from "express"
// import authMiddleWare from "../middleware/auth"
import authMiddleWare from "../middleware/auth.js"
import Rule from "../models/Rule.js"
import {body,query,validationResult} from "express-validator"

const router = Router()
router.use(authMiddleWare)


const validate = (req,res,next  )=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(500).json({error:errors.array()});
    }
    next();
}

const ruleValidation = [
    body('type').isIn(['OTP', 'Bank', 'Promo', 'Delivery', 'Spam', 'Personal']).withMessage('Invalid type'),
    body('pattern').notEmpty().withMessage('Pattern required'),
    body('action').isIn(['delete', 'archive', 'notify']).withMessage('Invalid action'),
    body('ttl').optional().isInt({ min: 1 }).withMessage('TTL must be a positive integer'),
    body('priority').optional().isInt({ min: 0 }).withMessage('Priority must be non-negative'),
];


router.post('/',ruleValidation,validate,async (req,res)=>{
    try{
        const {type,pattern,action,ttl,priority} = req.body;

        const rule = await Rule.create({
            userId:req.user.id,
            type,pattern,action,
            ttl: ttl ??60,
            priority:priority??0
        });
        res.status(201).json({rule});
    }
    catch(error){
        res.status(500).json({error:error.message});
    }
});

const queryValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('updatedAfter').optional().isISO8601(),
]


router.get('/',queryValidation,async (req,res)=>{
    try{
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip  = (page-1)*limit;
        const filter = {userId:req.user.id};

        if (req.query.updatedAfter)
            filter.updatedAt = { $gt: new Date(req.query.updatedAfter) };

        const [rules, total] = await Promise.all([
            Rule.find(filter).sort({ priority: -1 }).skip(skip).limit(limit),
            Rule.countDocuments(filter),
        ])
        res.json({
            rules,
            pagination :{page,limit,total,pages:Math.ceil(total/limit)}
        });
    }
    catch(error){
        res.status(500).json({error:error.message});
    }
});

router.get('/:id', async (req, res) => {
  try {
    const rule = await Rule.findOne({ _id: req.params.id, userId: req.user.id });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json(rule);
  } catch (e) { res.status(500).json({ error: e.message }); }
}); 


router.put('/:id', ruleValidation, validate, async (req, res) => {
  try {
    const { type, pattern, action, ttl, priority, isActive } = req.body;
    const rule = await Rule.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },  // userId check prevents other users editing your rules
      { type, pattern, action, ttl, priority, isActive },
      { new: true, runValidators: true }
    );
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json(rule);
  } catch (e) { res.status(500).json({ error: e.message }); }
});


router.delete('/:id', async (req, res) => {
  try {
    const rule = await Rule.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json({ message: 'Rule deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;