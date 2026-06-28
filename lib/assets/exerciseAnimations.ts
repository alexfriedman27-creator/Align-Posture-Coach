// Static require map — Metro needs every require() arg to be a string literal,
// so each exercise gets its own line (no dynamic paths).
//
// TO ADD AN ANIMATION:
//   1. Drop <exercise_id>.json into assets/animations/exercises/
//   2. Delete the leading `//` on that exercise's line below.
// Any exercise without an entry falls back to the "Animation coming soon"
// placeholder automatically — never crashes. Custom exercises always fall back.
//
// All 68 built-in exercise ids are pre-listed below, grouped by slot.
const EXERCISE_ANIMATION_MAP: Record<string, ReturnType<typeof require>> = {
  // --- Neck ---
  // chin_tuck:                    require('../../assets/animations/exercises/chin_tuck.json'),
  // chin_tuck_supine:             require('../../assets/animations/exercises/chin_tuck_supine.json'),
  // chin_tuck_wall:               require('../../assets/animations/exercises/chin_tuck_wall.json'),
  // deep_neck_flexor_resisted:    require('../../assets/animations/exercises/deep_neck_flexor_resisted.json'),
  // neck_rotation_stretch:        require('../../assets/animations/exercises/neck_rotation_stretch.json'),
  // upper_trap_stretch:           require('../../assets/animations/exercises/upper_trap_stretch.json'),
  // levator_scapulae_stretch:     require('../../assets/animations/exercises/levator_scapulae_stretch.json'),
  // isometric_neck_extension:     require('../../assets/animations/exercises/isometric_neck_extension.json'),
  // prone_neck_extension:         require('../../assets/animations/exercises/prone_neck_extension.json'),
  // scalene_stretch:              require('../../assets/animations/exercises/scalene_stretch.json'),
  // lateral_neck_flexion_stretch: require('../../assets/animations/exercises/lateral_neck_flexion_stretch.json'),

  // --- Shoulder / Scapula ---
  // doorway_pec_stretch_mid:          require('../../assets/animations/exercises/doorway_pec_stretch_mid.json'),
  // doorway_pec_stretch_high:         require('../../assets/animations/exercises/doorway_pec_stretch_high.json'),
  // prone_scapular_retraction:        require('../../assets/animations/exercises/prone_scapular_retraction.json'),
  // seated_scapular_squeeze:          require('../../assets/animations/exercises/seated_scapular_squeeze.json'),
  // scapular_posterior_tilt:          require('../../assets/animations/exercises/scapular_posterior_tilt.json'),
  // standing_scapular_posterior_tilt: require('../../assets/animations/exercises/standing_scapular_posterior_tilt.json'),
  // wall_slides:                      require('../../assets/animations/exercises/wall_slides.json'),
  // wall_angel:                       require('../../assets/animations/exercises/wall_angel.json'),
  // floor_slides_snow_angel:          require('../../assets/animations/exercises/floor_slides_snow_angel.json'),
  // prone_y_raise:                    require('../../assets/animations/exercises/prone_y_raise.json'),
  // prone_t_raise:                    require('../../assets/animations/exercises/prone_t_raise.json'),
  // prone_w_raise:                    require('../../assets/animations/exercises/prone_w_raise.json'),
  // side_lying_external_rotation:     require('../../assets/animations/exercises/side_lying_external_rotation.json'),
  // serratus_punch_supine:            require('../../assets/animations/exercises/serratus_punch_supine.json'),
  // push_up_plus:                     require('../../assets/animations/exercises/push_up_plus.json'),
  // serratus_floor_press:             require('../../assets/animations/exercises/serratus_floor_press.json'),
  // prone_i_raise:                    require('../../assets/animations/exercises/prone_i_raise.json'),
  // bilateral_doorway_pec_stretch:    require('../../assets/animations/exercises/bilateral_doorway_pec_stretch.json'),

  // --- Upper Back (thoracic) ---
  // standing_thoracic_extension_wall:  require('../../assets/animations/exercises/standing_thoracic_extension_wall.json'),
  // chair_back_thoracic_extension:     require('../../assets/animations/exercises/chair_back_thoracic_extension.json'),
  // prone_extension_superman:          require('../../assets/animations/exercises/prone_extension_superman.json'),
  // swimmers_prone_extension:          require('../../assets/animations/exercises/swimmers_prone_extension.json'),
  // cat_cow:                           require('../../assets/animations/exercises/cat_cow.json'),
  // seated_cat_cow:                    require('../../assets/animations/exercises/seated_cat_cow.json'),
  // quadruped_thoracic_rotation:       require('../../assets/animations/exercises/quadruped_thoracic_rotation.json'),
  // seated_thoracic_rotation:          require('../../assets/animations/exercises/seated_thoracic_rotation.json'),
  // standing_thoracic_rotation:        require('../../assets/animations/exercises/standing_thoracic_rotation.json'),
  // open_book_stretch:                 require('../../assets/animations/exercises/open_book_stretch.json'),
  // child_pose_thoracic_stretch:       require('../../assets/animations/exercises/child_pose_thoracic_stretch.json'),
  // extended_child_pose_lateral_reach: require('../../assets/animations/exercises/extended_child_pose_lateral_reach.json'),
  // prone_cobra:                       require('../../assets/animations/exercises/prone_cobra.json'),
  // cobra_pose_stretch:                require('../../assets/animations/exercises/cobra_pose_stretch.json'),
  // standing_backbend_reach:           require('../../assets/animations/exercises/standing_backbend_reach.json'),

  // --- Core / Pelvis ---
  // dead_bug:                 require('../../assets/animations/exercises/dead_bug.json'),
  // supine_marching:          require('../../assets/animations/exercises/supine_marching.json'),
  // bird_dog:                 require('../../assets/animations/exercises/bird_dog.json'),
  // standing_bird_dog:        require('../../assets/animations/exercises/standing_bird_dog.json'),
  // side_plank:               require('../../assets/animations/exercises/side_plank.json'),
  // modified_side_plank_knee: require('../../assets/animations/exercises/modified_side_plank_knee.json'),
  // front_plank:              require('../../assets/animations/exercises/front_plank.json'),
  // incline_plank:            require('../../assets/animations/exercises/incline_plank.json'),
  // posterior_pelvic_tilt:    require('../../assets/animations/exercises/posterior_pelvic_tilt.json'),
  // quadruped_pelvic_tilt:    require('../../assets/animations/exercises/quadruped_pelvic_tilt.json'),
  // plank_shoulder_taps:      require('../../assets/animations/exercises/plank_shoulder_taps.json'),

  // --- Hip ---
  // hip_flexor_lunge_stretch:    require('../../assets/animations/exercises/hip_flexor_lunge_stretch.json'),
  // standing_hip_flexor_stretch: require('../../assets/animations/exercises/standing_hip_flexor_stretch.json'),
  // couch_stretch:               require('../../assets/animations/exercises/couch_stretch.json'),
  // glute_bridge:                require('../../assets/animations/exercises/glute_bridge.json'),
  // single_leg_glute_bridge:     require('../../assets/animations/exercises/single_leg_glute_bridge.json'),
  // clamshell:                   require('../../assets/animations/exercises/clamshell.json'),
  // side_lying_hip_abduction:    require('../../assets/animations/exercises/side_lying_hip_abduction.json'),
  // hip_90_90_stretch:           require('../../assets/animations/exercises/hip_90_90_stretch.json'),

  // --- Full Body (integration) ---
  // single_leg_balance_reset:   require('../../assets/animations/exercises/single_leg_balance_reset.json'),
  // single_leg_balance_reach:   require('../../assets/animations/exercises/single_leg_balance_reach.json'),
  // postural_awareness_cueing:  require('../../assets/animations/exercises/postural_awareness_cueing.json'),
  // phone_pickup_posture_check: require('../../assets/animations/exercises/phone_pickup_posture_check.json'),
  // tandem_stance_balance:      require('../../assets/animations/exercises/tandem_stance_balance.json'),
};

export function getExerciseAnimation(id: string): ReturnType<typeof require> | null {
  return EXERCISE_ANIMATION_MAP[id] ?? null;
}
